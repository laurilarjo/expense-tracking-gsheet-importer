import { mkdir, readFile, writeFile, unlink, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { BlobStore } from './blob-store';

const DEFAULT_ROOT = path.join(process.cwd(), '.data', 'blob');

/**
 * Local filesystem BlobStore for development when BLOB_READ_WRITE_TOKEN is unset.
 */
export class FileSystemBlobStore implements BlobStore {
  constructor(private readonly root: string = process.env.BLOB_FS_ROOT || DEFAULT_ROOT) {}

  private resolve(key: string): string {
    const safe = key.replace(/^\/+/, '');
    return path.join(this.root, safe);
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await readFile(this.resolve(key), 'utf8');
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
    try {
      const buf = await readFile(this.resolve(key));
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
    try {
      await unlink(this.resolve(key));
    } catch {
      // ignore missing
    }
  }

  /**
   * List keys under root that start with prefix.
   * Prefix may be a partial filename (e.g. sessions/-123_) not only a directory.
   */
  async list(prefix: string): Promise<string[]> {
    const normalized = prefix.replace(/^\/+/, '');
    const results: string[] = [];

    // Walk from the deepest existing directory along the prefix path
    let dir = this.root;
    const parts = normalized.split('/').filter(Boolean);
    let walked = '';
    for (const part of parts) {
      const candidate = path.join(dir, part);
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

    await this.walk(dir, walked, results);
    return results.filter((k) => k.startsWith(normalized));
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
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walk(full, key, out);
      } else if (entry.isFile()) {
        out.push(key);
      }
    }
  }
}
