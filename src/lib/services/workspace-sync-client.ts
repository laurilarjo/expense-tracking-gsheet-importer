import type { AppSettings } from '../types/settings';
import type { ModelArtifactsBundle } from './ml-categorization-service';

function sheetsAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('google_sheets_token');
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (!token || (expiresAt && Date.now() >= expiresAt)) return null;
    return token as string;
  } catch {
    return null;
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sheetsAccessToken();
  if (!token) {
    throw new Error('Authorize Google Sheets first to sync workspace');
  }
  const res = await fetch(`/api/workspace${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Workspace API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function syncWorkspaceSettings(settings: AppSettings): Promise<void> {
  await api('', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
}

export async function createTelegramLink(): Promise<{ deepLink: string; token: string }> {
  return api('?action=telegram-link', { method: 'POST', body: '{}' });
}

export async function fetchWorkspaceInfo(): Promise<{
  workspaceId: string;
  serviceAccountEmail: string | null;
  botUsername: string | null;
}> {
  return api('');
}

export async function syncMemberModel(
  memberId: string,
  bundle: ModelArtifactsBundle
): Promise<void> {
  await api(`?action=model&memberId=${encodeURIComponent(memberId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      modelTopology: bundle.modelTopology,
      weightSpecs: bundle.weightSpecs,
      weightDataBase64: arrayBufferToBase64(bundle.weightData),
      vocabulary: bundle.vocabulary,
      categories: bundle.categories,
      metadata: bundle.metadata,
    }),
  });
}
