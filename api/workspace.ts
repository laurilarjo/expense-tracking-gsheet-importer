import type { VercelRequest, VercelResponse } from '@vercel/node';
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
import type { AppSettings } from '../src/lib/types/settings';
import type { ModelArtifactsBundle } from '../src/lib/services/ml-categorization-service';
import type { WorkspaceSettings } from '../src/lib/types/workspace';

export const config = {
  maxDuration: 60,
};

async function authorize(req: VercelRequest): Promise<string> {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw Object.assign(new Error('Missing Bearer token'), { status: 401 });
  }
  return resolveGoogleSubFromAccessToken(match[1]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : '';

  try {
    if (req.method === 'GET') {
      const workspaceId = await authorize(req);
      const store = createBlobStore();
      const ws = new WorkspaceService(store);
      const settings = await ws.getSettings(workspaceId);
      return res.status(200).json({
        workspaceId,
        settings,
        serviceAccountEmail: getServiceAccountEmail(),
        botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      });
    }

    if (req.method === 'POST' && action === 'telegram-link') {
      const workspaceId = await authorize(req);
      const store = createBlobStore();
      const ws = new WorkspaceService(store);
      const existing = await ws.getSettings(workspaceId);
      if (!existing) {
        await ws.saveSettings(workspaceId, {
          googleSheetsId: '',
          linkedTelegramUserIds: [],
          boundChatIds: [],
          members: [],
        });
      }
      const token = await ws.createPairingToken(workspaceId);
      const bot = process.env.TELEGRAM_BOT_USERNAME || 'YourBot';
      const deepLink = `https://t.me/${bot.replace(/^@/, '')}?start=${token}`;
      return res.status(200).json({ token, deepLink, expiresInSeconds: 15 * 60 });
    }

    if (req.method === 'PUT' && action === 'model') {
      const workspaceId = await authorize(req);
      const memberId =
        typeof req.query.memberId === 'string' ? req.query.memberId : req.body?.memberId;
      if (!memberId) {
        return res.status(400).json({ error: 'memberId required' });
      }
      const body = req.body as {
        modelTopology: unknown;
        weightSpecs: unknown;
        weightDataBase64: string;
        vocabulary: string[];
        categories: string[];
        metadata: ModelArtifactsBundle['metadata'];
      };

      const weightData = Buffer.from(body.weightDataBase64, 'base64');
      const bundle: ModelArtifactsBundle = {
        modelTopology: body.modelTopology,
        weightSpecs: body.weightSpecs as ModelArtifactsBundle['weightSpecs'],
        weightData: weightData.buffer.slice(
          weightData.byteOffset,
          weightData.byteOffset + weightData.byteLength
        ),
        vocabulary: body.vocabulary,
        categories: body.categories,
        metadata: body.metadata,
      };

      const store = createBlobStore();
      const modelStore = new ModelStore(store);
      await modelStore.saveArtifacts(workspaceId, memberId, bundle);
      return res.status(200).json({
        ok: true,
        path: memberModelPrefix(workspaceId, memberId),
      });
    }

    if (req.method === 'PUT') {
      const workspaceId = await authorize(req);
      const body = req.body as {
        settings?: AppSettings;
        workspace?: WorkspaceSettings;
      };
      const store = createBlobStore();
      const ws = new WorkspaceService(store);
      const existing = (await ws.getSettings(workspaceId)) || {
        googleSheetsId: '',
        linkedTelegramUserIds: [],
        boundChatIds: [],
        members: [],
      };

      let next: WorkspaceSettings;
      if (body.workspace) {
        next = {
          ...body.workspace,
          linkedTelegramUserIds:
            body.workspace.linkedTelegramUserIds ?? existing.linkedTelegramUserIds,
          boundChatIds: body.workspace.boundChatIds ?? existing.boundChatIds,
        };
      } else if (body.settings) {
        next = appSettingsToWorkspace(body.settings, {
          linkedTelegramUserIds: existing.linkedTelegramUserIds,
          boundChatIds: existing.boundChatIds,
        });
      } else {
        return res.status(400).json({ error: 'settings or workspace required' });
      }

      await ws.saveSettings(workspaceId, next);
      return res.status(200).json({ ok: true, workspaceId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    console.error('api/workspace error:', error);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
