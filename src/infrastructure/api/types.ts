export interface ApiMeta {
  current_page?: number;
  page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
  [key: string]: unknown;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
  request_id?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  request_id?: string;
  message?: string;
  errors?: Record<string, string[] | string>;
}

export interface ApiResult<T> {
  data: T;
  meta?: ApiMeta;
  requestId?: string;
  stale?: boolean;
  cachedAt?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
  hasMore: boolean;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  idempotencyKey?: string;
  cacheKey?: string;
  allowStaleOnNetworkError?: boolean;
  signal?: AbortSignal;
}
