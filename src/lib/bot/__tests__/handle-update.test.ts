import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { handleTelegramUpdate } from '../handle-update';
import { WorkspaceService } from '../../services/workspace-service';
import { Bank } from '../../types/bank';
import { createFakeDeps, FakeTelegram, FakeSheets } from './fakes';
import type { BotDeps } from '../types';
import type { MemoryBlobStore } from '../../storage/blob-store';

const fixturePath = join(process.cwd(), 'test-fixtures', 'op-sample.csv');

describe('handleTelegramUpdate', () => {
  let deps: BotDeps & { telegram: FakeTelegram; sheets: FakeSheets; store: MemoryBlobStore };
  let fileBytes: Uint8Array;

  beforeEach(() => {
    fileBytes = new Uint8Array(readFileSync(fixturePath));
    deps = createFakeDeps(fileBytes, 'op.csv') as typeof deps;
  });

  async function seedHousehold() {
    const ws = new WorkspaceService(deps.store);
    await ws.saveSettings('ws-lauri', {
      googleSheetsId: 'sheet-lauri',
      linkedTelegramUserIds: [111],
      boundChatIds: [],
      members: [{ id: 'm-lauri', name: 'Lauri', allowedBanks: [Bank.OP] }],
    });
    await ws.saveSettings('ws-becky', {
      googleSheetsId: 'sheet-becky',
      linkedTelegramUserIds: [222],
      boundChatIds: [],
      members: [{ id: 'm-becky', name: 'Becky', allowedBanks: [Bank.OP] }],
    });
    await ws.linkTelegramUser(111, 'ws-lauri');
    await ws.linkTelegramUser(222, 'ws-becky');
    await ws.appendChatWorkspace(-100, 'ws-lauri');
    await ws.appendChatWorkspace(-100, 'ws-becky');
  }

  it('rejects wrong webhook secret', async () => {
    const res = await handleTelegramUpdate(
      {},
      deps,
      new Headers({ 'x-telegram-bot-api-secret-token': 'wrong' })
    );
    expect(res.status).toBe(401);
  });

  it('pairs /start token to telegram user', async () => {
    const ws = new WorkspaceService(deps.store);
    await ws.saveSettings('ws-lauri', {
      googleSheetsId: 'sheet',
      linkedTelegramUserIds: [],
      boundChatIds: [],
      members: [{ id: 'm1', name: 'Lauri', allowedBanks: [Bank.OP] }],
    });
    const token = await ws.createPairingToken('ws-lauri');

    await handleTelegramUpdate(
      {
        message: {
          message_id: 1,
          chat: { id: 111, type: 'private' },
          from: { id: 111 },
          text: `/start ${token}`,
        },
      },
      deps,
      new Headers({ 'x-telegram-bot-api-secret-token': 'secret' })
    );

    expect(await ws.getTelegramWorkspace(111)).toBe('ws-lauri');
    expect(deps.telegram.lastText()).toMatch(/linked/i);
  });

  it('appends workspace on add-bot and Join', async () => {
    const ws = new WorkspaceService(deps.store);
    await ws.saveSettings('ws-lauri', {
      googleSheetsId: 's',
      linkedTelegramUserIds: [111],
      boundChatIds: [],
      members: [{ id: 'm1', name: 'Lauri', allowedBanks: [Bank.OP] }],
    });
    await ws.saveSettings('ws-becky', {
      googleSheetsId: 's2',
      linkedTelegramUserIds: [222],
      boundChatIds: [],
      members: [{ id: 'm2', name: 'Becky', allowedBanks: [Bank.OP] }],
    });
    await ws.linkTelegramUser(111, 'ws-lauri');
    await ws.linkTelegramUser(222, 'ws-becky');

    await handleTelegramUpdate(
      {
        my_chat_member: {
          chat: { id: -100, type: 'channel', title: 'Expenses' },
          from: { id: 111 },
          new_chat_member: { status: 'administrator', user: { id: 1, is_bot: true } },
        },
      },
      deps,
      new Headers({ 'x-telegram-bot-api-secret-token': 'secret' })
    );

    expect(await ws.getChatWorkspaces(-100)).toEqual(['ws-lauri']);

    const joinMsg = deps.telegram.messages[0];
    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'cq1',
          from: { id: 222 },
          message: {
            message_id: joinMsg.messageId,
            chat: { id: -100, type: 'channel' },
          },
          data: 'join',
        },
      },
      deps,
      new Headers({ 'x-telegram-bot-api-secret-token': 'secret' })
    );

    expect(await ws.getChatWorkspaces(-100)).toEqual(['ws-lauri', 'ws-becky']);
  });

  it('rejects unlinked adder', async () => {
    await handleTelegramUpdate(
      {
        my_chat_member: {
          chat: { id: -100, type: 'channel' },
          from: { id: 999 },
          new_chat_member: { status: 'administrator', user: { id: 1, is_bot: true } },
        },
      },
      deps,
      new Headers({ 'x-telegram-bot-api-secret-token': 'secret' })
    );
    expect(deps.telegram.lastText()).toMatch(/Connect Telegram/i);
  });

  it('runs who → bank → parse → dry-run → upload without storing file bytes', async () => {
    await seedHousehold();
    const headers = new Headers({ 'x-telegram-bot-api-secret-token': 'secret' });

    await handleTelegramUpdate(
      {
        channel_post: {
          message_id: 50,
          chat: { id: -100, type: 'channel' },
          document: { file_id: 'file-1', file_name: 'op.csv' },
        },
      },
      deps,
      headers
    );

    const reply = deps.telegram.messages[0];
    expect(reply.text).toMatch(/Who is this file for/i);

    // Session must not contain transactions (main key + by-reply index)
    const sessionKeys = await deps.store.list('sessions/');
    expect(sessionKeys.length).toBeGreaterThanOrEqual(1);
    const session = await deps.store.getJson<Record<string, unknown>>(
      sessionKeys.find((k) => !k.includes('/by-reply/')) || sessionKeys[0]
    );
    expect(session?.fileId).toBe('file-1');
    expect(session).not.toHaveProperty('transactions');
    expect(JSON.stringify(session)).not.toContain('TILISIIRTO');

    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'c1',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'who:0',
        },
      },
      deps,
      headers
    );
    expect(deps.telegram.lastText()).toMatch(/Which bank/i);

    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'c2',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'bank:op',
        },
      },
      deps,
      headers
    );
    expect(deps.telegram.lastText()).toMatch(/Parsed \d+ transactions/i);
    expect(deps.telegram.lastText()).toMatch(/Run recognition/i);

    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'c3',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'rec:skip',
        },
      },
      deps,
      headers
    );
    expect(deps.telegram.lastText()).toMatch(/Dry run or upload/i);

    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'c4',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'up:dry',
        },
      },
      deps,
      headers
    );
    expect(deps.sheets.calls[0]?.dryRun).toBe(true);
    expect(deps.sheets.calls[0]?.spreadsheetId).toBe('sheet-lauri');
    expect(deps.telegram.lastText()).toMatch(/Dry run/i);

    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'c5',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'up:yes',
        },
      },
      deps,
      headers
    );
    expect(deps.sheets.calls[1]?.dryRun).toBe(false);
    expect(deps.sheets.calls[1]?.spreadsheetId).toBe('sheet-lauri');
    expect(deps.telegram.lastText()).toMatch(/Upload summary|Written/i);

    // Session cleaned up
    expect(await deps.store.list('sessions/')).toHaveLength(0);
  });

  it('group /newfile then reply with document starts import', async () => {
    await seedHousehold();
    const headers = new Headers({ 'x-telegram-bot-api-secret-token': 'secret' });

    await handleTelegramUpdate(
      {
        message: {
          message_id: 1,
          chat: { id: -100, type: 'supergroup', title: 'Expenses' },
          from: { id: 111 },
          text: '/newfile',
        },
      },
      deps,
      headers
    );

    const prompt = deps.telegram.messages[0];
    expect(prompt.text).toMatch(/Reply to this message/i);

    await handleTelegramUpdate(
      {
        message: {
          message_id: 2,
          chat: { id: -100, type: 'supergroup' },
          from: { id: 111 },
          reply_to_message: { message_id: prompt.messageId },
          document: { file_id: 'file-g', file_name: 'op.csv' },
        },
      },
      deps,
      headers
    );

    expect(deps.telegram.lastText()).toMatch(/Who is this file for/i);
  });

  it('choosing Becky uses Becky spreadsheet id', async () => {
    await seedHousehold();
    const headers = new Headers({ 'x-telegram-bot-api-secret-token': 'secret' });

    await handleTelegramUpdate(
      {
        channel_post: {
          message_id: 60,
          chat: { id: -100, type: 'channel' },
          document: { file_id: 'f', file_name: 'op.csv' },
        },
      },
      deps,
      headers
    );
    const reply = deps.telegram.messages[0];

    // who:1 = Becky (second member)
    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'a',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'who:1',
        },
      },
      deps,
      headers
    );
    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'b',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'bank:op',
        },
      },
      deps,
      headers
    );
    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'c',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'rec:skip',
        },
      },
      deps,
      headers
    );
    await handleTelegramUpdate(
      {
        callback_query: {
          id: 'd',
          from: { id: 111 },
          message: { message_id: reply.messageId, chat: { id: -100, type: 'channel' } },
          data: 'up:yes',
        },
      },
      deps,
      headers
    );

    expect(deps.sheets.calls[0]?.spreadsheetId).toBe('sheet-becky');
  });
});
