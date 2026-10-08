import { MemoryBlobStore } from '../../storage/blob-store';
import type { InlineButton, SheetsWriter, TelegramClient } from '../types';
import type { UploadResult } from '../../types/upload-result';
import type { Transaction } from '../../types/transaction';

export class FakeTelegram implements TelegramClient {
  messages: Array<{
    chatId: string | number;
    text: string;
    replyTo?: number;
    buttons?: InlineButton[][];
    messageId: number;
  }> = [];
  edits: Array<{ chatId: string | number; messageId: number; text: string }> = [];
  answered: string[] = [];
  private nextId = 100;
  fileBytes = new Uint8Array();
  fileName = 'sample.csv';

  async sendMessage(chatId, text, options) {
    const messageId = this.nextId++;
    this.messages.push({
      chatId,
      text,
      replyTo: options?.replyToMessageId,
      buttons: options?.buttons,
      messageId,
    });
    return { messageId };
  }

  async editMessage(chatId, messageId, text) {
    this.edits.push({ chatId, messageId, text });
    const msg = this.messages.find((m) => m.messageId === messageId);
    if (msg) msg.text = text;
  }

  async answerCallbackQuery(id: string) {
    this.answered.push(id);
  }

  async downloadFile() {
    return { bytes: this.fileBytes, fileName: this.fileName };
  }

  lastText(): string {
    const lastEdit = this.edits[this.edits.length - 1];
    if (lastEdit) return lastEdit.text;
    return this.messages[this.messages.length - 1]?.text || '';
  }
}

export class FakeSheets implements SheetsWriter {
  calls: Array<{ dryRun?: boolean; count: number; spreadsheetId: string }> = [];

  async importToSheets(
    transactions: Transaction[],
    _context,
    spreadsheetId: string,
    options?: { dryRun?: boolean }
  ): Promise<UploadResult> {
    this.calls.push({
      dryRun: options?.dryRun,
      count: transactions.length,
      spreadsheetId,
    });
    return {
      success: true,
      existingTransactionsCount: 0,
      fileTransactionsCount: transactions.length,
      newTransactionsCount: transactions.length,
      writtenTransactionsCount: options?.dryRun ? 0 : transactions.length,
      newTransactions: transactions,
    };
  }
}

export function createFakeDeps(fileBytes: Uint8Array, fileName = 'op.csv') {
  const store = new MemoryBlobStore();
  const telegram = new FakeTelegram();
  telegram.fileBytes = fileBytes;
  telegram.fileName = fileName;
  const sheets = new FakeSheets();
  return {
    store,
    telegram,
    sheets,
    webhookSecret: 'secret',
  };
}
