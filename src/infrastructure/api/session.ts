import { API_CACHE_PREFIX, SESSION_STORAGE_KEY } from './config';

export interface UserContextResource {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  status: string;
  identity_status?: string | null;
  resource_version?: number;
  tenant?: { id: string; name?: string | null; slug?: string | null; timezone?: string | null; currency?: string | null } | null;
  membership?: { id: string; branch_id?: string | null; merchant_id?: string | null; driver_id?: string | null; status: string } | null;
  merchant_id?: string | null;
  driver_id?: string | null;
  roles: string[];
  permissions: string[];
}

export interface DashboardSession {
  token: string;
  tokenType: string;
  user: UserContextResource;
  cachedAt: string;
}

function purgeLegacyPersistentSession() {
  try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* storage can be unavailable */ }
}

export function readSession(): DashboardSession | null {
  purgeLegacyPersistentSession();
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardSession;
    if (!parsed.token || !parsed.user?.id) return null;
    return parsed;
  } catch { return null; }
}

export function saveSession(session: DashboardSession) {
  purgeLegacyPersistentSession();
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  purgeLegacyPersistentSession();
  try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* storage can be unavailable */ }
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(API_CACHE_PREFIX)) localStorage.removeItem(key);
  }
}

export function sessionToken() { return readSession()?.token ?? null; }

export const SESSION_EXPIRED_EVENT = 'deliver-it:session-expired';
export function emitSessionExpired() { window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT)); }
