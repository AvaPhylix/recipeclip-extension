import type { AuthState } from './types';

const AUTH_KEY = 'recipeclip_auth';

export async function getAuth(): Promise<AuthState | null> {
  const result = await chrome.storage.sync.get(AUTH_KEY);
  const auth = result[AUTH_KEY] as AuthState | undefined;
  if (!auth) return null;
  // Check if token is expired (with 60s buffer)
  if (auth.expires_at && Date.now() / 1000 > auth.expires_at - 60) {
    await clearAuth();
    return null;
  }
  return auth;
}

export async function setAuth(auth: AuthState): Promise<void> {
  await chrome.storage.sync.set({ [AUTH_KEY]: auth });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.sync.remove(AUTH_KEY);
}
