const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

export const API_BASE_URL = rawBaseUrl
  ? rawBaseUrl.replace(/\/$/, '')
  : import.meta.env.DEV
    ? 'http://localhost:8000'
    : '';

export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 25000);
export const API_MAX_RETRIES = Math.max(0, Number(import.meta.env.VITE_API_MAX_RETRIES ?? 2));
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION ?? '1.3.0');
export const APP_LOCALE_KEY = 'deliver-it-locale';
export const SESSION_STORAGE_KEY = 'deliver-it-dashboard-session-v1';
export const DEVICE_STORAGE_KEY = 'deliver-it-dashboard-device-id-v1';
export const API_CACHE_PREFIX = 'deliver-it-api-cache-v1:';

export function ensureApiConfigured() {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is required in production.');
}

export function getOrCreateDeviceId() {
  const current = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (current) return current;
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_STORAGE_KEY, id);
  return id;
}
