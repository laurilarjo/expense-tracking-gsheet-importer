import { createBlobStore } from '../storage/blob-store';
import { createGrammyTelegramClient } from './grammy-telegram-client';
import { createServiceAccountSheetsWriter } from './sheets-writer';
import type { BotDeps } from './types';

export function createProductionBotDeps(): BotDeps {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  return {
    store: createBlobStore(),
    telegram: createGrammyTelegramClient(token),
    sheets: createServiceAccountSheetsWriter(),
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
  };
}
