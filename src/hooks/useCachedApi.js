import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/axios';
import { toast } from 'toasticom';

// Module-level in-memory cache. Survives across components, resets on page reload.
//   key  → { data, expiresAt, inflight }
const cache = new Map();
const subscribers = new Map(); // key → Set<callback>

function notify(key) {
    const subs = subscribers.get(key);
    if (subs) for (const cb of subs) {
        try { cb(); } catch (e) { console.error('[cache] subscriber error', e); }
    }
}

function subscribe(key, cb) {
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key).add(cb);
    return () => {
        subscribers.get(key)?.delete(cb);
    };
}

// Invalidate one key OR every key matching a prefix.
// SWR-style: keep the data, mark it stale → subscribed components keep showing it
// while a fresh fetch runs in the background. Better UX than wiping to a loading state.
export function invalidateCache(prefix) {
    for (const key of cache.keys()) {
        if (key === prefix || key.startsWith(prefix + '?') || key.startsWith(prefix + '/')) {
            const entry = cache.get(key);
            if (entry) cache.set(key, { ...entry, expiresAt: 0, inflight: null });
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

// Module-level fetcher — no component state, safe to call from anywhere
async function fetchOne(key, endpoint, params, ttl, force = false) {
    const entry = cache.get(key);
    if (!force && entry?.inflight) return entry.inflight;
    if (!force && entry?.data && entry.expiresAt > Date.now()) return entry.data;

    const promise = api.get(endpoint, { params }).then(
        (resp) => {
            cache.set(key, { data: resp.data, expiresAt: Date.now() + ttl, inflight: null });
            notify(key);
            return resp.data;
        },
        (err) => {
            const cur = cache.get(key) || {};
            cache.set(key, { ...cur, inflight: null });
            notify(key);
            throw err;
        }
    );

    cache.set(key, { ...(entry || {}), inflight: promise });
    notify(key);
    return promise;
}

// useCachedApi('/shops', { status: 'pending' }, { ttl: 60_000 })
//   → { data, isLoading, isFetching, refresh }
export function useCachedApi(endpoint, params, options = {}) {
    const { ttl = 30_000, enabled = true } = options;
    const key = buildKey(endpoint, params);

    // Latest params via ref so the effect deps don't depend on object identity
    const paramsRef = useRef(params);
    paramsRef.current = params;

    const [, force] = useState(0);
    const tick      = useCallback(() => force((n) => n + 1), []);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Subscribe + fetch in a single effect.
    // Triggers a fetch when: first mount, key changes, or invalidateCache notifies.
    useEffect(() => {
        if (!enabled) return;

        const ensureFresh = () => {
            const entry  = cache.get(key);
            const fresh  = entry?.data && entry.expiresAt > Date.now();
            const inflight = entry?.inflight;

            tick(); // re-render to surface current cache state

            if (!inflight && !fresh) {
                fetchOne(key, endpoint, paramsRef.current, ttl).catch((err) => {
                    if (isMounted.current) {
                        toast('error', err?.response?.data?.message || err?.message || 'Request failed');
                    }
                });
            }
        };

        ensureFresh();
        return subscribe(key, ensureFresh);
    }, [key, enabled, endpoint, ttl, tick]);

    const refresh = useCallback(() => {
        return fetchOne(key, endpoint, paramsRef.current, ttl, true).catch(() => {});
    }, [key, endpoint, ttl]);

    const entry = cache.get(key);
    return {
        data:       entry?.data ?? null,
        isLoading:  !entry?.data,           // only true when we have nothing to show
        isFetching: !!entry?.inflight,      // true during foreground OR background fetch
        error:      null,
        refresh,
    };
}
