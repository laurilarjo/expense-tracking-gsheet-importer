import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileSystemBlobStore } from '../fs-blob-store';

describe('FileSystemBlobStore.list', () => {
  let root: string;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it('lists keys when prefix is a partial filename under a directory', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'blob-'));
    const store = new FileSystemBlobStore(root);
    await store.putJson('sessions/-426276086_10.json', { a: 1 });
    await store.putJson('sessions/-426276086_11.json', { b: 2 });
    await store.putJson('sessions/other_1.json', { c: 3 });

    const keys = await store.list('sessions/-426276086_');
    expect(keys.sort()).toEqual([
      'sessions/-426276086_10.json',
      'sessions/-426276086_11.json',
    ]);
  });
});
