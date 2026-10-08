import { mkdir, readFile, writeFile, unlink, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { BlobStore } from './blob-store';

const DEFAULT_ROOT = path.join(process.cwd(), '.data', 'blob');

export class InvalidBlobKeyError extends Error {
  constructor(message = 'Invalid blob key') {
    super(message);
    this.name = 'InvalidBlobKeyError';
  }
}

/**
 * Local filesystem BlobStore for development when BLOB_READ_WRITE_TOKEN is unset.
 */
export class FileSystemBlobStore implements BlobStore {
  private readonly rootResolved: string;

  constructor(root: string = process.env.BLOB_FS_ROOT || DEFAULT_ROOT) {
    this.rootResolved = path.resolve(root);
  }

  /**
   * Resolve a blob key to an absolute path under the store root.
   * Rejects empty keys, absolute keys, and any `.` / `..` segments.
   */
  private resolve(key: string): string {
    const segments = this.keySegments(key);
    const full = path.resolve(this.rootResolved, ...segments);
    if (!this.isInsideRoot(full)) {
      throw new InvalidBlobKeyError();
    }
    return full;
  }

  private keySegments(key: string): string[] {
    if (typeof key !== 'string' || !key || key.includes('\0')) {
      throw new InvalidBlobKeyError();
    }
    if (path.isAbsolute(key) || /^[a-zA-Z]:[\\/]/.test(key)) {
      throw new InvalidBlobKeyError();
    }
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) {
      throw new InvalidBlobKeyError();
    }
    const segments = normalized.split('/');
    for (const segment of segments) {
      if (!segment || segment === '.' || segment === '..') {
        throw new InvalidBlobKeyError();
      }
    }
    return segments;
  }

  private isInsideRoot(absolutePath: string): boolean {
    const rel = path.relative(this.rootResolved, absolutePath);
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const filePath = this.resolve(key);
    try {
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async putJson(key: string, value: unknown): Promise<void> {
    const filePath = this.resolve(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
  }

  async getBytes(key: string): Promise<Uint8Array | null> {
    const filePath = this.resolve(key);
    try {
      const buf = await readFile(filePath);
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async putBytes(key: string, data: Uint8Array): Promise<void> {
    const filePath = this.resolve(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, Buffer.from(data));
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    try {
      await unlink(filePath);
    } catch {
      // ignore missing
    }
  }

  /**
   * List keys under root that start with prefix.
   * Prefix may be a partial filename (e.g. sessions/-123_) not only a directory.
   */
  async list(prefix: string): Promise<string[]> {
    if (typeof prefix !== 'string' || prefix.includes('\0')) {
      throw new InvalidBlobKeyError();
    }
    if (path.isAbsolute(prefix) || /^[a-zA-Z]:[\\/]/.test(prefix)) {
      throw new InvalidBlobKeyError();
    }

    const prefixNorm = prefix.replace(/\\/g, '/').replace(/^\/+/, '');
    const parts = prefixNorm.split('/').filter((p) => p.length > 0);
    for (const part of parts) {
      if (part === '.' || part === '..') {
        throw new InvalidBlobKeyError();
      }
    }

    const results: string[] = [];

    // Walk from the deepest existing directory along the prefix path
    let dir = this.rootResolved;
    let walked = '';
    for (const part of parts) {
      const candidate = path.resolve(dir, part);
      if (candidate !== this.rootResolved && !this.isInsideRoot(candidate)) {
        throw new InvalidBlobKeyError();
      }
      try {
        const s = await stat(candidate);
        if (s.isDirectory()) {
          dir = candidate;
          walked = walked ? `${walked}/${part}` : part;
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    if (dir !== this.rootResolved && !this.isInsideRoot(dir)) {
      throw new InvalidBlobKeyError();
    }

    await this.walk(dir, walked, results);
    return results.filter((k) => k.startsWith(prefixNorm));
  }

  private async walk(dir: string, prefix: string, out: string[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.resolve(dir, entry.name);
      if (!this.isInsideRoot(full)) {
        continue;
      }
      if (entry.isDirectory()) {
        await this.walk(full, key, out);
      } else if (entry.isFile()) {
        out.push(key);
      }
    }
  }
}
