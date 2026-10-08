import { Bot, InlineKeyboard } from 'grammy';
import type { InlineButton, TelegramClient } from './types';

export function createGrammyTelegramClient(token: string): TelegramClient {
  const bot = new Bot(token);

  function toKeyboard(buttons?: InlineButton[][]): InlineKeyboard | undefined {
    if (!buttons?.length) return undefined;
    const kb = new InlineKeyboard();
    buttons.forEach((row, ri) => {
      row.forEach((btn) => {
        kb.text(btn.text, btn.callbackData);
      });
      if (ri < buttons.length - 1) kb.row();
    });
    return kb;
  }

  return {
    async sendMessage(chatId, text, options) {
      const msg = await bot.api.sendMessage(chatId, text, {
        reply_parameters: options?.replyToMessageId
          ? { message_id: options.replyToMessageId }
          : undefined,
        reply_markup: toKeyboard(options?.buttons),
      });
      return { messageId: msg.message_id };
    },

    async editMessage(chatId, messageId, text, options) {
      await bot.api.editMessageText(chatId, messageId, text, {
        reply_markup: toKeyboard(options?.buttons),
      });
    },

    async answerCallbackQuery(callbackQueryId, text) {
      await bot.api.answerCallbackQuery(callbackQueryId, { text });
    },

    async downloadFile(fileId) {
      const file = await bot.api.getFile(fileId);
      if (!file.file_path) {
        throw new Error('Telegram file_path missing');
      }
      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to download Telegram file: ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const fileName = file.file_path.split('/').pop() || 'statement';
      return { bytes, fileName };
    },
  };
}

export function createGrammyBot(token: string): Bot {
  return new Bot(token);
}
