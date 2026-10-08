import { describe, it, expect } from 'vitest';
import { MemoryBlobStore } from '../../storage/blob-store';
import { WorkspaceService, appSettingsToWorkspace } from '../workspace-service';
import { Bank } from '../../types/bank';

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
});
