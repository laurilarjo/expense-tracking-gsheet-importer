import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTelegramUpdate } from '../src/lib/bot/handle-update';
import { createProductionBotDeps } from '../src/lib/bot/create-deps';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  let deps;
  try {
    deps = createProductionBotDeps();
  } catch (error) {
    console.error('api/telegram misconfigured:', error);
    return res
      .status(503)
      .send(error instanceof Error ? error.message : 'Bot not configured');
  }

  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value[0]);
    }

    const response = await handleTelegramUpdate(req.body, deps, headers);
    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (error) {
    console.error('api/telegram error:', error);
    return res.status(200).send('ok');
  }
}
