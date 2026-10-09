/**
 * Tiny in-memory cache for Supabase reads shared across hook instances.
 * - Dedupes concurrent requests for the same key (one network call).
 * - Serves cached values until the TTL expires.
 * - Failed requests are never cached.
 */
type Entry = { value?: unknown; expires: number; promise?: Promise<unknown> };
const store = new Map<string, Entry>();

export function cachedFetch<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit?.promise) return hit.promise as Promise<T>;
  if (hit && "value" in hit && hit.expires > now) return Promise.resolve(hit.value as T);

  const promise = fn()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });
  store.set(key, { expires: 0, promise });
  return promise;
}

/** Overwrite a cached value (e.g. after a local mutation). */
export function setCached<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/** Drop cached entries whose key starts with the given prefix. */
export function invalidateCache(prefix = "") {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
