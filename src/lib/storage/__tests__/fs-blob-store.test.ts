import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileSystemBlobStore, InvalidBlobKeyError } from '../fs-blob-store';

describe('FileSystemBlobStore', () => {
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

  it('rejects path traversal on get/put/delete/list', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'blob-'));
    const store = new FileSystemBlobStore(root);
    const escapeKey = 'pairings/../../../secret-escape.json';

    await expect(store.getJson(escapeKey)).rejects.toBeInstanceOf(InvalidBlobKeyError);
    await expect(store.putJson(escapeKey, { x: 1 })).rejects.toBeInstanceOf(InvalidBlobKeyError);
    await expect(store.delete(escapeKey)).rejects.toBeInstanceOf(InvalidBlobKeyError);
    await expect(store.list('../')).rejects.toBeInstanceOf(InvalidBlobKeyError);
    await expect(store.list('pairings/../..')).rejects.toBeInstanceOf(InvalidBlobKeyError);
  });

  it('does not delete files outside the root via .. keys', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'blob-'));
    const parent = path.dirname(root);
    const victimName = `victim-${Date.now()}.json`;
    const victimPath = path.join(parent, victimName);
    await writeFile(victimPath, JSON.stringify({ keep: true }), 'utf8');

    const store = new FileSystemBlobStore(root);
    const key = `pairings/../${victimName}`;

    await expect(store.getJson(key)).rejects.toBeInstanceOf(InvalidBlobKeyError);
    await expect(store.delete(key)).rejects.toBeInstanceOf(InvalidBlobKeyError);

    expect(JSON.parse(await readFile(victimPath, 'utf8'))).toEqual({ keep: true });
    await rm(victimPath, { force: true });
  });

  it('allows normal nested keys inside the root', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'blob-'));
    const store = new FileSystemBlobStore(root);
    await store.putJson('workspaces/abc/members/user-1/model/metadata.json', { ok: true });
    const value = await store.getJson<{ ok: boolean }>(
      'workspaces/abc/members/user-1/model/metadata.json'
    );
    expect(value).toEqual({ ok: true });
  });
});
