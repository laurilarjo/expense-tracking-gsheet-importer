import { FileSystemBlobStore } from './fs-blob-store';
import { VercelBlobStore } from './vercel-blob-store';

/**
 * Key/value store for workspace settings, models, indexes, and bot sessions.
 * Never used for bank statement files or parsed transactions.
 */
export interface BlobStore {
  getJson<T>(key: string): Promise<T | null>;
  putJson(key: string, value: unknown): Promise<void>;
  getBytes(key: string): Promise<Uint8Array | null>;
  putBytes(key: string, data: Uint8Array, contentType?: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class MemoryBlobStore implements BlobStore {
  private json = new Map<string, string>();
  private bytes = new Map<string, Uint8Array>();

  async getJson<T>(key: string): Promise<T | null> {
    const raw = this.json.get(key);
    if (raw === undefined) return null;
    return JSON.parse(raw) as T;
  }

  async putJson(key: string, value: unknown): Promise<void> {
    this.json.set(key, JSON.stringify(value));
  }

  async getBytes(key: string): Promise<Uint8Array | null> {
    return this.bytes.get(key) ?? null;
  }

  async putBytes(key: string, data: Uint8Array): Promise<void> {
    this.bytes.set(key, data);
  }

  async delete(key: string): Promise<void> {
    this.json.delete(key);
    this.bytes.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    const keys = new Set([...this.json.keys(), ...this.bytes.keys()]);
    return [...keys].filter((k) => k.startsWith(prefix));
  }
}

export function createBlobStore(): BlobStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStore();
  }
  return new FileSystemBlobStore();
}
