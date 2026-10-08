/**
 * Minimal local API for workspace sync during `npm run dev`.
 * Uses filesystem BlobStore when BLOB_READ_WRITE_TOKEN is unset.
 */
import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createBlobStore } from '../src/lib/storage/blob-store';
import {
  WorkspaceService,
  appSettingsToWorkspace,
  memberModelPrefix,
} from '../src/lib/services/workspace-service';
import {
  getServiceAccountEmail,
  resolveGoogleSubFromAccessToken,
} from '../src/lib/services/google-service-account';
import { ModelStore } from '../src/lib/services/model-store';
import { handleTelegramUpdate } from '../src/lib/bot/handle-update';
import { createProductionBotDeps } from '../src/lib/bot/create-deps';
import type { AppSettings } from '../src/lib/types/settings';

const PORT = Number(process.env.API_PORT || 8787);

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

async function authorize(req: IncomingMessage): Promise<string> {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const err = new Error('Missing Bearer token') as Error & { status: number };
    err.status = 401;
    throw err;
  }
  return resolveGoogleSubFromAccessToken(match[1]);
}

function send(res: ServerResponse, status: number, body: unknown) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
  });
  res.end(payload);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 204, '');
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/api/telegram' && req.method === 'POST') {
      let deps;
      try {
        deps = createProductionBotDeps();
      } catch (error) {
        return send(res, 503, {
          error: error instanceof Error ? error.message : 'Bot not configured',
        });
      }
      const body = await readJson(req);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') headers.set(k, v);
      }
      const response = await handleTelegramUpdate(body, deps, headers);
      return send(res, response.status, await response.text());
    }

    if (url.pathname === '/api/workspace') {
      const action = url.searchParams.get('action') || '';

      if (req.method === 'GET') {
        const workspaceId = await authorize(req);
        const ws = new WorkspaceService(createBlobStore());
        const settings = await ws.getSettings(workspaceId);
        return send(res, 200, {
          workspaceId,
          settings,
          serviceAccountEmail: getServiceAccountEmail(),
          botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
        });
      }

      if (req.method === 'POST' && action === 'telegram-link') {
        const workspaceId = await authorize(req);
        const ws = new WorkspaceService(createBlobStore());
        if (!(await ws.getSettings(workspaceId))) {
          await ws.saveSettings(workspaceId, {
            googleSheetsId: '',
            linkedTelegramUserIds: [],
            boundChatIds: [],
            members: [],
          });
        }
        const token = await ws.createPairingToken(workspaceId);
        const bot = process.env.TELEGRAM_BOT_USERNAME || 'YourBot';
        return send(res, 200, {
          token,
          deepLink: `https://t.me/${bot.replace(/^@/, '')}?start=${token}`,
          expiresInSeconds: 15 * 60,
        });
      }

      if (req.method === 'PUT' && action === 'model') {
        const workspaceId = await authorize(req);
        const body = await readJson(req);
        const memberId =
          url.searchParams.get('memberId') || (body.memberId as string | undefined);
        if (!memberId) return send(res, 400, { error: 'memberId required' });
        const weightData = Buffer.from(body.weightDataBase64 as string, 'base64');
        const store = createBlobStore();
        await new ModelStore(store).saveArtifacts(workspaceId, memberId, {
          modelTopology: body.modelTopology,
          weightSpecs: body.weightSpecs as never,
          weightData: weightData.buffer.slice(
            weightData.byteOffset,
            weightData.byteOffset + weightData.byteLength
          ),
          vocabulary: body.vocabulary as string[],
          categories: body.categories as string[],
          metadata: body.metadata as never,
        });
        return send(res, 200, {
          ok: true,
          path: memberModelPrefix(workspaceId, memberId),
        });
      }

      if (req.method === 'PUT') {
        const workspaceId = await authorize(req);
        const body = await readJson(req);
        const ws = new WorkspaceService(createBlobStore());
        const existing = (await ws.getSettings(workspaceId)) || {
          googleSheetsId: '',
          linkedTelegramUserIds: [],
          boundChatIds: [],
          members: [],
        };
        const next = body.workspace
          ? {
              ...(body.workspace as object),
              linkedTelegramUserIds:
                (body.workspace as { linkedTelegramUserIds?: number[] })
                  .linkedTelegramUserIds ?? existing.linkedTelegramUserIds,
              boundChatIds:
                (body.workspace as { boundChatIds?: string[] }).boundChatIds ??
                existing.boundChatIds,
            }
          : appSettingsToWorkspace(body.settings as AppSettings, {
              linkedTelegramUserIds: existing.linkedTelegramUserIds,
              boundChatIds: existing.boundChatIds,
            });
        await ws.saveSettings(workspaceId, next as never);
        return send(res, 200, { ok: true, workspaceId });
      }
    }

    send(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    send(res, (error as { status?: number }).status || 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `Local API on http://localhost:${PORT} (store=${
      process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : '.data/blob'
    })`
  );
});
