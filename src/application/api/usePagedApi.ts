import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../infrastructure/api/client';
import { friendlyApiMessage } from '../../infrastructure/api/errors';
import type { ApiMeta } from '../../infrastructure/api/types';

interface UsePagedApiOptions<T, R = unknown> {
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  pageSize?: number;
  cacheKey?: string;
  map?: (value: R) => T;
  enabled?: boolean;
}

export function usePagedApi<T, R = unknown>({ path, query, pageSize = 30, cacheKey, map, enabled = true }: UsePagedApiOptions<T, R>) {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<ApiMeta>({ current_page: 0, per_page: pageSize, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);
  const queryRef = useRef(query);
  queryRef.current = query;

  const load = useCallback(async (page = 1, append = false) => {
    if (!enabled) { setItems([]); setLoading(false); return; }
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const result = await api.get<R[]>(path, {
        query: { ...(queryRef.current ?? {}), page, per_page: pageSize },
        cacheKey: page === 1 && cacheKey ? cacheKey : undefined,
        allowStaleOnNetworkError: page === 1 && Boolean(cacheKey),
      });
      const next = (result.data ?? []).map((value) => map ? map(value) : value as unknown as T);
      setItems((current) => append ? dedupe([...current, ...next]) : next);
      setMeta(result.meta ?? { current_page: page, per_page: pageSize, total: next.length, last_page: page });
    } catch (err) { setError(friendlyApiMessage(err)); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [cacheKey, enabled, map, pageSize, path]);

  useEffect(() => { void queryKey; void load(1, false); }, [load, queryKey]);

  const currentPage = Number(meta.current_page ?? meta.page ?? 1);
  const lastPage = Number(meta.last_page ?? 1);
  const hasMore = currentPage < lastPage;
  return {
    items, meta, loading, loadingMore, error,
    total: Number(meta.total ?? items.length),
    hasMore,
    refresh: () => load(1, false),
    loadMore: () => hasMore && !loadingMore ? load(currentPage + 1, true) : Promise.resolve(),
  };
}

function dedupe<T>(values: T[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = typeof value === 'object' && value !== null && 'id' in value ? String((value as { id: unknown }).id) : JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
