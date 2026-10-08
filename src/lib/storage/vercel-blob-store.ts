import { put, del, list, head } from '@vercel/blob';
import type { BlobStore } from './blob-store';

/**
 * Production BlobStore backed by Vercel Blob (private).
 */
export class VercelBlobStore implements BlobStore {
  async getJson<T>(key: string): Promise<T | null> {
    const bytes = await this.getBytes(key);
    if (!bytes) return null;
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }

  async putJson(key: string, value: unknown): Promise<void> {
    const body = JSON.stringify(value);
    await put(key, body, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
  }

  async getBytes(key: string): Promise<Uint8Array | null> {
    try {
      const meta = await head(key);
      const res = await fetch(meta.url, {
        headers: process.env.BLOB_READ_WRITE_TOKEN
          ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
          : undefined,
      });
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  async putBytes(key: string, data: Uint8Array, contentType = 'application/octet-stream'): Promise<void> {
    await put(key, Buffer.from(data), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
  }

  async delete(key: string): Promise<void> {
    try {
      await del(key);
    } catch {
      // ignore
    }
  }

  async list(prefix: string): Promise<string[]> {
    const { blobs } = await list({ prefix });
    return blobs.map((b) => b.pathname);
  }
}
