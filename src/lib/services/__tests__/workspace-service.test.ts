import { describe, it, expect } from 'vitest';
import { MemoryBlobStore } from '../../storage/blob-store';
import {
  WorkspaceService,
  appSettingsToWorkspace,
  memberModelPrefix,
  pairingKey,
} from '../workspace-service';
import { Bank } from '../../types/bank';
import { ModelStore } from '../model-store';


describe('WorkspaceService', () => {
  it('never stores oauth tokens when saving settings from AppSettings', async () => {
    const store = new MemoryBlobStore();
    const ws = new WorkspaceService(store);
    const settings = appSettingsToWorkspace({
      users: [{ id: 'u1', name: 'Lauri', allowedBanks: [Bank.OP] }],
      googleSheetsId: 'abc',
      exchangeratesApiKey: 'fx',
    });
    await ws.saveSettings('ws1', settings);
    const raw = JSON.stringify(await store.getJson('workspaces/ws1/settings.json'));
    expect(raw).not.toMatch(/ya29\.|access_token|refresh_token/i);
    expect(raw).toContain('abc');
  });

  it('appendChatWorkspace is idempotent', async () => {
    const store = new MemoryBlobStore();
    const ws = new WorkspaceService(store);
    await ws.saveSettings('ws1', {
      googleSheetsId: 's',
      linkedTelegramUserIds: [],
      boundChatIds: [],
      members: [],
    });
    await ws.appendChatWorkspace(-1, 'ws1');
    await ws.appendChatWorkspace(-1, 'ws1');
    expect(await ws.getChatWorkspaces(-1)).toEqual(['ws1']);
  });

  it('pairing token expires after consume', async () => {
    const store = new MemoryBlobStore();
    const ws = new WorkspaceService(store);
    const token = await ws.createPairingToken('ws1');
    expect(await ws.consumePairingToken(token)).toBe('ws1');
    expect(await ws.consumePairingToken(token)).toBeNull();
  });

  it('rejects non-hex pairing tokens without touching the store', async () => {
    const store = new MemoryBlobStore();
    const ws = new WorkspaceService(store);
    expect(await ws.consumePairingToken('../etc/passwd')).toBeNull();
    expect(await ws.consumePairingToken('pairings/../../tmp/x')).toBeNull();
    expect(() => pairingKey('../../tmp/secret')).toThrow(/Invalid pairing token/);
  });

  it('rejects path-traversal memberId when building model paths', async () => {
    expect(() => memberModelPrefix('ws1', '../../../../tmp/evil')).toThrow(/Invalid memberId/);
    expect(() => memberModelPrefix('..', 'user-1')).toThrow(/Invalid workspaceId/);
  });

  it('ModelStore.saveArtifacts rejects traversal memberId', async () => {
    const store = new MemoryBlobStore();
    const models = new ModelStore(store);
    await expect(
      models.saveArtifacts('ws1', '../../../../tmp/evil', {
        modelTopology: {},
        weightSpecs: [],
        weightData: new ArrayBuffer(0),
        vocabulary: [],
        categories: [],
        metadata: {
          version: '1',
          accuracy: 0,
          categories: [],
          trainingDate: new Date(),
          transactionCount: 0,
          validationAccuracy: 0,
        },
      })
    ).rejects.toThrow(/Invalid memberId/);
  });
});


