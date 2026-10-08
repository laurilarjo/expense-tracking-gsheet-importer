/**
 * Local Telegram long-polling (no webhook / no Vercel Blob required).
 * Usage: TELEGRAM_BOT_TOKEN=... npm run bot:dev
 */
import 'dotenv/config';
import { Bot } from 'grammy';
import { handleTelegramUpdate } from '../src/lib/bot/handle-update';
import { createGrammyTelegramClient } from '../src/lib/bot/grammy-telegram-client';
import { createBlobStore } from '../src/lib/storage/blob-store';
import { createServiceAccountSheetsWriter } from '../src/lib/bot/sheets-writer';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Set TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const deps = {
  store: createBlobStore(),
  telegram: createGrammyTelegramClient(token),
  sheets: createServiceAccountSheetsWriter(),
  botUsername: process.env.TELEGRAM_BOT_USERNAME,
};

const bot = new Bot(token);

function summarizeUpdate(update: Record<string, unknown>): string {
  if (update.message) {
    const m = update.message as {
      chat?: { id?: number; type?: string; title?: string };
      document?: { file_name?: string };
      text?: string;
      from?: { id?: number };
    };
    return `message chat=${m.chat?.id} type=${m.chat?.type} from=${m.from?.id} doc=${m.document?.file_name || '-'} text=${m.text?.slice(0, 40) || '-'}`;
  }
  if (update.channel_post) {
    const m = update.channel_post as {
      chat?: { id?: number; type?: string };
      document?: { file_name?: string };
    };
    return `channel_post chat=${m.chat?.id} doc=${m.document?.file_name || '-'}`;
  }
  if (update.callback_query) {
    const c = update.callback_query as { data?: string; from?: { id?: number } };
    return `callback_query from=${c.from?.id} data=${c.data}`;
  }
  if (update.my_chat_member) {
    const m = update.my_chat_member as {
      chat?: { id?: number; type?: string };
      new_chat_member?: { status?: string };
    };
    return `my_chat_member chat=${m.chat?.id} type=${m.chat?.type} status=${m.new_chat_member?.status}`;
  }
  return `other keys=${Object.keys(update).join(',')}`;
}

bot.use(async (ctx, next) => {
  console.log(`[tg] update_id=${ctx.update.update_id} ${summarizeUpdate(ctx.update as unknown as Record<string, unknown>)}`);
  await next();
});

bot.catch((err) => {
  console.error('[tg] bot error:', err.error ?? err);
});

async function run(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.error(`[tg] handler failed (${label}):`, error);
  }
}

bot.on('message', async (ctx) => {
  await run('message', () => handleTelegramUpdate({ message: ctx.update.message }, deps));
});
bot.on('channel_post', async (ctx) => {
  await run('channel_post', () =>
    handleTelegramUpdate({ channel_post: ctx.update.channel_post }, deps)
  );
});
bot.on('callback_query', async (ctx) => {
  await run('callback_query', () =>
    handleTelegramUpdate({ callback_query: ctx.update.callback_query }, deps)
  );
});
bot.on('my_chat_member', async (ctx) => {
  await run('my_chat_member', () =>
    handleTelegramUpdate({ my_chat_member: ctx.update.my_chat_member }, deps)
  );
});

console.log(
  'Starting Telegram long polling (BlobStore = %s)...',
  process.env.BLOB_READ_WRITE_TOKEN ? 'vercel' : 'filesystem .data/blob'
);
console.log(
  'Tip: in groups with privacy mode on, send /newfile then reply to the bot with your bank file.'
);
await bot.start({
  onStart: (info) => console.log(`Bot @${info.username} running`),
});
