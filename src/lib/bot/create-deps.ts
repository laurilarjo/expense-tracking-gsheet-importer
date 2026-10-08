import { createBlobStore } from '../storage/blob-store';
import { createGrammyTelegramClient } from './grammy-telegram-client';
import { createServiceAccountSheetsWriter } from './sheets-writer';
import type { BotDeps } from './types';

/**
 * Deps for the public webhook (/api/telegram). Requires bot token and webhook secret.
 * Local long-polling (scripts/bot-dev.ts) builds deps separately and must not use this.
 */
export function createProductionBotDeps(): BotDeps {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET is not set');
  }
  return {
    store: createBlobStore(),
    telegram: createGrammyTelegramClient(token),
    sheets: createServiceAccountSheetsWriter(),
    webhookSecret,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
  };
}
