import { APP_VERSION, API_BASE_URL, API_CACHE_PREFIX, API_MAX_RETRIES, API_TIMEOUT_MS, ensureApiConfigured, getOrCreateDeviceId } from './config';
import { ApiClientError, classifyStatus } from './errors';
import { getLocale } from '../../i18n';
import { emitSessionExpired, readSession, sessionToken } from './session';
import type { ApiEnvelope, ApiErrorEnvelope, ApiRequestOptions, ApiResult } from './types';

function randomId(prefix = '') {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}${id}`;
}

function buildUrl(path: string, query?: ApiRequestOptions['query']) {
  ensureApiConfigured();
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function cacheStorageKey(key: string) {
  const session = readSession();
  const tenantId = session?.user?.tenant?.id ?? 'public';
  const userId = session?.user?.id ?? 'anonymous';
  return `${API_CACHE_PREFIX}${tenantId}:${userId}:${key}`;
}

function readCached<T>(key: string): { data: T; meta?: import('./types').ApiMeta; cachedAt: string } | null {
  try {
    const raw = localStorage.getItem(cacheStorageKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCached<T>(key: string, result: ApiResult<T>) {
  try { localStorage.setItem(cacheStorageKey(key), JSON.stringify({ data: result.data, meta: result.meta, cachedAt: new Date().toISOString() })); } catch { /* quota/cache is best-effort */ }
}

function retryAfter(response: Response) {
  const value = response.headers.get('Retry-After');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - Date.now()) / 1000)) : undefined;
}

function flattenValidationErrors(errors?: Record<string, string[] | string>) {
  if (!errors) return undefined;
  const values = Object.values(errors).flatMap((value) => Array.isArray(value) ? value : [value]);
  return values.slice(0, 5);
}

async function sleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { window.clearTimeout(id); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResult<T>> {
  const method = (options.method ?? 'GET').toUpperCase();
  const token = sessionToken();
  const requestId = randomId('web-');
  // Never invent idempotency for arbitrary writes. Login/OTP/reset and other
  // non-idempotent commands must not be replayed automatically. Callers opt in
  // with a stable key only for endpoints whose contract declares idempotency.
  const idempotencyKey = options.idempotencyKey;
  const maxRetries = options.retries ?? API_MAX_RETRIES;
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const canRetry = safeMethod || Boolean(idempotencyKey);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? API_TIMEOUT_MS);
    const relayAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', relayAbort, { once: true });
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Device-Id': getOrCreateDeviceId(),
        'X-App-Version': APP_VERSION,
        'Accept-Language': getLocale(),
        ...options.headers,
      };
      if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

      const response = await fetch(buildUrl(path, options.query), {
        method,
        headers,
        body: options.body === undefined || method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(options.body),
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });

      let payload: ApiEnvelope<T> | ApiErrorEnvelope | null = null;
      const text = await response.text();
      if (text) {
        try { payload = JSON.parse(text) as ApiEnvelope<T> | ApiErrorEnvelope; }
        catch { payload = null; }
      }

      if (response.ok && payload && 'success' in payload && payload.success === true) {
        const result: ApiResult<T> = { data: payload.data, meta: payload.meta, requestId: payload.request_id ?? response.headers.get('X-Request-Id') ?? requestId };
        if (options.cacheKey && method === 'GET') saveCached(options.cacheKey, result);
        return result;
      }

      if (response.ok && payload === null) {
        const result: ApiResult<T> = { data: undefined as T, requestId };
        return result;
      }

      const errorPayload = payload && 'success' in payload && payload.success === false ? payload : undefined;
      const status = response.status;
      const code = errorPayload?.error?.code ?? `HTTP_${status}`;
      const details = errorPayload?.error?.details ?? flattenValidationErrors(errorPayload?.errors);
      const error = new ApiClientError(errorPayload?.error?.message ?? errorPayload?.message ?? response.statusText, status, code, classifyStatus(status), errorPayload?.request_id ?? requestId, details, retryAfter(response));
      if (status === 401 && token) emitSessionExpired();
      lastError = error;

      const retryableStatus = status === 429 || status === 502 || status === 503 || status === 504;
      if (!canRetry || !retryableStatus || attempt >= maxRetries) throw error;
      const delaySeconds = error.retryAfterSeconds ?? Math.min(4, 0.5 * 2 ** attempt);
      await sleep(delaySeconds * 1000, options.signal);
    } catch (raw) {
      let error = raw;
      if (raw instanceof DOMException && raw.name === 'AbortError') {
        error = new ApiClientError('Request timed out.', null, 'REQUEST_TIMEOUT', 'timeout', requestId);
      } else if (raw instanceof TypeError) {
        error = new ApiClientError(raw.message, null, 'NETWORK_ERROR', 'network', requestId);
      }
      lastError = error;
      if (!canRetry || attempt >= maxRetries || !(error instanceof ApiClientError) || !['network', 'timeout', 'server'].includes(error.kind)) break;
      await sleep(Math.min(4000, 400 * 2 ** attempt), options.signal);
    } finally {
      window.clearTimeout(timeout);
      options.signal?.removeEventListener('abort', relayAbort);
    }
  }

  if (options.cacheKey && options.allowStaleOnNetworkError && lastError instanceof ApiClientError && ['network', 'timeout', 'server'].includes(lastError.kind)) {
    const cached = readCached<T>(options.cacheKey);
    if (cached) { window.dispatchEvent(new CustomEvent('deliver-it:stale-data', { detail: { cachedAt: cached.cachedAt } })); return { data: cached.data, meta: cached.meta, stale: true, cachedAt: cached.cachedAt, requestId: lastError.requestId }; }
  }
  throw lastError instanceof Error ? lastError : new ApiClientError('Unknown API error.', null, 'UNKNOWN_ERROR', 'unknown', requestId);
}

export const api = {
  get: <T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => apiRequest<T>(path, { ...options, method: 'PATCH', body }),
};
