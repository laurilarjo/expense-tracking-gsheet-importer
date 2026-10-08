import { afterEach, describe, expect, it } from 'vitest';
import { createProductionBotDeps } from '../create-deps';

describe('createProductionBotDeps', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    if (originalSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
  });

  it('rejects missing TELEGRAM_BOT_TOKEN', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret';
    expect(() => createProductionBotDeps()).toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it('rejects missing TELEGRAM_WEBHOOK_SECRET', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(() => createProductionBotDeps()).toThrow(/TELEGRAM_WEBHOOK_SECRET/);
  });

  it('rejects empty TELEGRAM_WEBHOOK_SECRET', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TELEGRAM_WEBHOOK_SECRET = '   ';
    expect(() => createProductionBotDeps()).toThrow(/TELEGRAM_WEBHOOK_SECRET/);
  });
});
