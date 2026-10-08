import type { BlobStore } from '../storage/blob-store';
import type {
  AwaitingFile,
  BotSession,
  ChatIndex,
  PairingToken,
  TelegramIndex,
  WorkspaceMember,
  WorkspaceSettings,
} from '../types/workspace';
import type { AppSettings } from '../types/settings';
import { randomBytes } from 'node:crypto';

/** Pairing tokens are 16 random bytes as hex (32 chars). */
const PAIRING_TOKEN_RE = /^[a-f0-9]{32}$/;

/**
 * Single blob path segment: no slashes, no nulls, not `.` / `..` / dots-only.
 */
export function assertSafeBlobSegment(value: string, label = 'id'): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value === '.' ||
    value === '..' ||
    /^\.+$/.test(value)
  ) {
    throw Object.assign(new Error(`Invalid ${label}`), { status: 400 });
  }
  return value;
}

export function isValidPairingToken(token: string): boolean {
  return typeof token === 'string' && PAIRING_TOKEN_RE.test(token);
}

export function workspaceSettingsKey(workspaceId: string): string {
  return `workspaces/${assertSafeBlobSegment(workspaceId, 'workspaceId')}/settings.json`;
}

export function memberModelPrefix(workspaceId: string, memberId: string): string {
  return `workspaces/${assertSafeBlobSegment(workspaceId, 'workspaceId')}/members/${assertSafeBlobSegment(memberId, 'memberId')}/model`;
}

export function telegramIndexKey(telegramUserId: number): string {
  return `indexes/telegram/${telegramUserId}.json`;
}

export function chatIndexKey(chatId: string | number): string {
  return `indexes/chats/${chatId}.json`;
}

export function pairingKey(token: string): string {
  if (!isValidPairingToken(token)) {
    throw Object.assign(new Error('Invalid pairing token'), { status: 400 });
  }
  return `pairings/${token}.json`;
}

export function sessionKey(chatId: string | number, documentMessageId: number): string {
  return `sessions/${chatId}_${documentMessageId}.json`;
}

export function replySessionKey(chatId: string | number, replyMessageId: number): string {
  return `sessions/by-reply/${chatId}_${replyMessageId}.json`;
}

export function awaitingFileKey(chatId: string | number): string {
  return `awaiting/${chatId}.json`;
}

export function appSettingsToWorkspace(
  settings: AppSettings,
  extras?: Partial<WorkspaceSettings>
): WorkspaceSettings {
  return {
    googleSheetsId: settings.googleSheetsId,
    exchangeratesApiKey: settings.exchangeratesApiKey || '',
    linkedTelegramUserIds: extras?.linkedTelegramUserIds ?? [],
    boundChatIds: extras?.boundChatIds ?? [],
    members: settings.users.map(
      (u): WorkspaceMember => ({
        id: u.id,
        name: u.name,
        allowedBanks: u.allowedBanks,
      })
    ),
    displayName: extras?.displayName,
  };
}

export class WorkspaceService {
  constructor(private readonly store: BlobStore) {}

  async getSettings(workspaceId: string): Promise<WorkspaceSettings | null> {
    return this.store.getJson<WorkspaceSettings>(workspaceSettingsKey(workspaceId));
  }

  async saveSettings(workspaceId: string, settings: WorkspaceSettings): Promise<void> {
    // Never persist OAuth tokens — callers must not put them on settings
    const safe: WorkspaceSettings = {
      googleSheetsId: settings.googleSheetsId,
      exchangeratesApiKey: settings.exchangeratesApiKey,
      linkedTelegramUserIds: settings.linkedTelegramUserIds || [],
      boundChatIds: settings.boundChatIds || [],
      members: settings.members || [],
      displayName: settings.displayName,
    };
    await this.store.putJson(workspaceSettingsKey(workspaceId), safe);
  }

  async getTelegramWorkspace(telegramUserId: number): Promise<string | null> {
    const idx = await this.store.getJson<TelegramIndex>(telegramIndexKey(telegramUserId));
    return idx?.workspaceId ?? null;
  }

  async linkTelegramUser(telegramUserId: number, workspaceId: string): Promise<void> {
    await this.store.putJson(telegramIndexKey(telegramUserId), { workspaceId } satisfies TelegramIndex);
    const settings = (await this.getSettings(workspaceId)) || emptySettings();
    if (!settings.linkedTelegramUserIds.includes(telegramUserId)) {
      settings.linkedTelegramUserIds = [...settings.linkedTelegramUserIds, telegramUserId];
      await this.saveSettings(workspaceId, settings);
    }
  }

  async getChatWorkspaces(chatId: string | number): Promise<string[]> {
    const idx = await this.store.getJson<ChatIndex>(chatIndexKey(chatId));
    return idx?.workspaceIds ?? [];
  }

  async appendChatWorkspace(chatId: string | number, workspaceId: string): Promise<string[]> {
    const existing = await this.getChatWorkspaces(chatId);
    if (existing.includes(workspaceId)) return existing;
    const workspaceIds = [...existing, workspaceId];
    await this.store.putJson(chatIndexKey(chatId), { workspaceIds } satisfies ChatIndex);

    const settings = (await this.getSettings(workspaceId)) || emptySettings();
    const chatStr = String(chatId);
    if (!settings.boundChatIds.includes(chatStr)) {
      settings.boundChatIds = [...settings.boundChatIds, chatStr];
      await this.saveSettings(workspaceId, settings);
    }
    return workspaceIds;
  }

  async createPairingToken(workspaceId: string, ttlMs = 15 * 60 * 1000): Promise<string> {
    const token = randomBytes(16).toString('hex');
    const payload: PairingToken = {
      workspaceId,
      expiresAt: Date.now() + ttlMs,
    };
    await this.store.putJson(pairingKey(token), payload);
    return token;
  }

  async consumePairingToken(token: string): Promise<string | null> {
    if (!isValidPairingToken(token)) return null;
    const key = pairingKey(token);
    const payload = await this.store.getJson<PairingToken>(key);
    if (!payload) return null;
    await this.store.delete(key);
    if (payload.expiresAt < Date.now()) return null;
    return payload.workspaceId;
  }

  async getSession(chatId: string | number, documentMessageId: number): Promise<BotSession | null> {
    return this.store.getJson<BotSession>(sessionKey(chatId, documentMessageId));
  }

  async saveSession(session: BotSession): Promise<void> {
    // Privacy: only metadata fields
    const safe: BotSession = {
      chatId: session.chatId,
      documentMessageId: session.documentMessageId,
      fileId: session.fileId,
      fileName: session.fileName,
      replyMessageId: session.replyMessageId,
      step: session.step,
      workspaceId: session.workspaceId,
      memberId: session.memberId,
      bank: session.bank,
      categorized: session.categorized,
    };
    await this.store.putJson(sessionKey(session.chatId, session.documentMessageId), safe);
    // Direct index for callback lookups (avoids brittle prefix list on filesystem)
    if (safe.replyMessageId != null) {
      await this.store.putJson(replySessionKey(session.chatId, safe.replyMessageId), safe);
    }
  }

  async deleteSession(chatId: string | number, documentMessageId: number): Promise<void> {
    const existing = await this.getSession(chatId, documentMessageId);
    await this.store.delete(sessionKey(chatId, documentMessageId));
    if (existing?.replyMessageId != null) {
      await this.store.delete(replySessionKey(chatId, existing.replyMessageId));
    }
  }

  async findSessionByReplyMessage(
    chatId: string | number,
    replyMessageId: number
  ): Promise<BotSession | null> {
    const direct = await this.store.getJson<BotSession>(
      replySessionKey(chatId, replyMessageId)
    );
    if (direct) return direct;

    // Fallback: scan sessions for this chat
    const keys = await this.store.list(`sessions/${chatId}_`);
    for (const key of keys) {
      if (key.includes('/by-reply/')) continue;
      const session = await this.store.getJson<BotSession>(key);
      if (session?.replyMessageId === replyMessageId) return session;
    }
    return null;
  }

  /** Flatten members across all workspaces bound to a chat. */
  async listChatMembers(
    chatId: string | number
  ): Promise<Array<{ workspaceId: string; member: WorkspaceMember }>> {
    const workspaceIds = await this.getChatWorkspaces(chatId);
    const out: Array<{ workspaceId: string; member: WorkspaceMember }> = [];
    for (const workspaceId of workspaceIds) {
      const settings = await this.getSettings(workspaceId);
      if (!settings) continue;
      for (const member of settings.members) {
        out.push({ workspaceId, member });
      }
    }
    return out;
  }

  async isLinkedToChat(telegramUserId: number, chatId: string | number): Promise<boolean> {
    const workspaceId = await this.getTelegramWorkspace(telegramUserId);
    if (!workspaceId) return false;
    const bound = await this.getChatWorkspaces(chatId);
    return bound.includes(workspaceId);
  }

  async setAwaitingFile(awaiting: AwaitingFile): Promise<void> {
    await this.store.putJson(awaitingFileKey(awaiting.chatId), awaiting);
  }

  async getAwaitingFile(chatId: string | number): Promise<AwaitingFile | null> {
    const awaiting = await this.store.getJson<AwaitingFile>(awaitingFileKey(chatId));
    if (!awaiting) return null;
    if (awaiting.expiresAt < Date.now()) {
      await this.clearAwaitingFile(chatId);
      return null;
    }
    return awaiting;
  }

  async clearAwaitingFile(chatId: string | number): Promise<void> {
    await this.store.delete(awaitingFileKey(chatId));
  }
}

function emptySettings(): WorkspaceSettings {
  return {
    googleSheetsId: '',
    exchangeratesApiKey: '',
    linkedTelegramUserIds: [],
    boundChatIds: [],
    members: [],
  };
}
