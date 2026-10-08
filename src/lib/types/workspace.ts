import { Bank } from './bank';

/** A member under a Google-account workspace (sheet tab prefix + banks). */
export interface WorkspaceMember {
  id: string;
  name: string;
  allowedBanks: Bank[];
}

/** Cloud copy of one Google account's settings (never includes OAuth tokens). */
export interface WorkspaceSettings {
  googleSheetsId: string;
  exchangeratesApiKey?: string;
  linkedTelegramUserIds: number[];
  boundChatIds: string[];
  members: WorkspaceMember[];
  /** Display label for bot messages (optional). */
  displayName?: string;
}

export interface ChatIndex {
  workspaceIds: string[];
}

export interface TelegramIndex {
  workspaceId: string;
}

export interface PairingToken {
  workspaceId: string;
  expiresAt: number;
}

/** Waiting for a document reply after /newfile (privacy-mode friendly). */
export interface AwaitingFile {
  chatId: string;
  promptMessageId: number;
  requestedByTelegramId?: number;
  expiresAt: number;
}

/** Session metadata only — never store bank files or Transaction[]. */
export interface BotSession {
  chatId: string;
  documentMessageId: number;
  fileId: string;
  fileName: string;
  replyMessageId?: number;
  step:
    | 'who'
    | 'bank'
    | 'recognize'
    | 'upload_choice'
    | 'after_dry_run'
    | 'done';
  workspaceId?: string;
  memberId?: string;
  bank?: Bank;
  categorized?: boolean;
}
