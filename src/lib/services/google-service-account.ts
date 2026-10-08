import { GoogleAuth, JWT } from 'google-auth-library';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export function getServiceAccountEmail(): string | null {
  const creds = loadCredentials();
  return creds?.client_email ?? null;
}

function loadCredentials(): {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
} | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Access token for Google Sheets using the shared service account.
 */
export async function getServiceAccountAccessToken(): Promise<string> {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: [SHEETS_SCOPE],
  });
  const client = (await auth.getClient()) as JWT;
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) {
    throw new Error('Failed to obtain service account access token');
  }
  return tokenResponse.token;
}

/**
 * Resolve a stable Google account id from a browser OAuth access token.
 * Prefers `sub` (openid); falls back to email. Does not store the token.
 */
export async function resolveGoogleSubFromAccessToken(accessToken: string): Promise<string> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!res.ok) {
    throw new Error('Invalid Google access token');
  }
  const data = (await res.json()) as {
    sub?: string;
    email?: string;
    error?: string;
  };
  const id = data.sub || data.email;
  if (!id) {
    throw new Error(
      'Google tokeninfo did not return sub/email. Re-authorize with openid/email scopes.'
    );
  }
  // Sanitize for Blob path keys
  return id.replace(/[^a-zA-Z0-9._-]/g, '_');
}
