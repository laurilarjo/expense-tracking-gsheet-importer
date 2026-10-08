import type { BlobStore } from '../storage/blob-store';
import type { Transaction } from '../types/transaction';
import type { UploadResult } from '../types/upload-result';
import type { Bank } from '../types/bank';
import type { SheetsContext } from '../services/google-sheets-service';

export interface InlineButton {
  text: string;
  callbackData: string;
}

export interface TelegramClient {
  sendMessage(
    chatId: string | number,
    text: string,
    options?: { replyToMessageId?: number; buttons?: InlineButton[][] }
  ): Promise<{ messageId: number }>;
  editMessage(
    chatId: string | number,
    messageId: number,
    text: string,
    options?: { buttons?: InlineButton[][] }
  ): Promise<void>;
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>;
  downloadFile(fileId: string): Promise<{ bytes: Uint8Array; fileName: string }>;
}

export interface SheetsWriter {
  importToSheets(
    transactions: Transaction[],
    context: SheetsContext,
    spreadsheetId: string,
    options?: { dryRun?: boolean }
  ): Promise<UploadResult>;
}

export interface BotDeps {
  store: BlobStore;
  telegram: TelegramClient;
  sheets: SheetsWriter;
  webhookSecret?: string;
  botUsername?: string;
}

/** Minimal Telegram Update shapes we handle. */
export interface TelegramUpdate {
  update_id?: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  my_chat_member?: TelegramChatMemberUpdated;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string; title?: string };
  from?: { id: number; first_name?: string; username?: string };
  date?: number;
  text?: string;
  caption?: string;
  reply_to_message?: {
    message_id: number;
    from?: { id: number; is_bot?: boolean };
  };
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
  };
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number; first_name?: string; username?: string };
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramChatMemberUpdated {
  chat: { id: number; type: string; title?: string };
  from: { id: number; first_name?: string; username?: string };
  new_chat_member: { status: string; user: { id: number; is_bot?: boolean } };
  old_chat_member?: { status: string };
}

export type { Bank };
