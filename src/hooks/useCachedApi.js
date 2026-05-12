import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/axios';
import { toast } from 'toasticom';

// Module-level in-memory cache. Survives across components but resets on page reload.
//   key  → { data, expiresAt, inflight }
const cache = new Map();
const subscribers = new Map(); // key → Set<callback>

function notify(key) {
    const subs = subscribers.get(key);
    if (subs) for (const cb of subs) cb();
}

function subscribe(key, cb) {
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key).add(cb);
    return () => {
        subscribers.get(key)?.delete(cb);
    };
}

// Invalidate one key OR every key matching a prefix (e.g. invalidate('/shops') clears /shops + /shops/123)
export function invalidateCache(prefix) {
    for (const key of cache.keys()) {
        if (key === prefix || key.startsWith(prefix + '?') || key.startsWith(prefix + '/')) {
            cache.delete(key);
            notify(key);
        }
    }
}

export function clearAllCache() {
    cache.clear();
    for (const key of subscribers.keys()) notify(key);
}

function buildKey(endpoint, params) {
    if (!params || Object.keys(params).length === 0) return endpoint;
    const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return qs ? `${endpoint}?${qs}` : endpoint;
}

// useCachedApi('/shops', { status: 'pending' }, { ttl: 60_000 })
//   → { data, isLoading, error, refresh }
//
// Behaviour:
//   - First mount: returns cached data immediately if fresh, otherwise fetches
//   - Stale cache (past TTL): fires SWR — returns stale data while revalidating in background
//   - Multiple components asking for the same key → only ONE inflight request, all share the result
//   - `refresh()` forces a network call and updates every subscriber
export function useCachedApi(endpoint, params, options = {}) {
    const { ttl = 30_000, enabled = true } = options;
    const key = buildKey(endpoint, params);

    const [, force] = useState(0);
    const tick      = useCallback(() => force((n) => n + 1), []);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (!enabled) return;
        return subscribe(key, tick);
    }, [key, enabled, tick]);

    const fetcher = useCallback(async ({ force: forceRefresh = false } = {}) => {
        const entry = cache.get(key);

        // Use existing inflight request if any (dedupe)
        if (!forceRefresh && entry?.inflight) return entry.inflight;

        // Return cached if fresh and not forced
        if (!forceRefresh && entry && entry.expiresAt > Date.now()) {
            return entry.data;
        }

        const promise = api.get(endpoint, { params }).then(
            (resp) => {
                cache.set(key, { data: resp.data, expiresAt: Date.now() + ttl, inflight: null });
                notify(key);
                return resp.data;
            },
            (err) => {
                cache.set(key, { ...(cache.get(key) || {}), inflight: null });
                throw err;
            }
        );

        cache.set(key, { ...(entry || {}), inflight: promise });
        return promise;
    }, [endpoint, key, params, ttl]);

    // Trigger fetch on key change
    useEffect(() => {
        if (!enabled) return;
        const entry = cache.get(key);
        const fresh = entry && entry.expiresAt > Date.now();

        // If we have stale data, return it now and revalidate in background.
        if (entry?.data && !fresh) {
            fetcher().catch((err) => {
                if (isMounted.current) toast('error', err?.response?.data?.message || err?.message || 'Request failed');
            });
        } else if (!entry?.data) {
            fetcher().catch((err) => {
                if (isMounted.current) toast('error', err?.response?.data?.message || err?.message || 'Request failed');
            });
        }
    }, [key, enabled, fetcher]);

    const entry = cache.get(key);
    return {
        data:      entry?.data ?? null,
        isLoading: !entry?.data,        // only "loading" if nothing to show; SWR shows stale instantly
        isFetching: !!entry?.inflight,  // true during background revalidation
        error:     null,
        refresh:   () => fetcher({ force: true }).catch(() => {}),
    };
}
