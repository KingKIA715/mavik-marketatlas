// In-memory TTL cache for server-side data fetches.
// Lives per Worker isolate; sufficient to collapse bursts and respect API quotas.

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;
  const value = await loader();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

export function clearCache(prefix?: string): number {
  if (!prefix) {
    const n = store.size;
    store.clear();
    return n;
  }
  let n = 0;
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) {
      store.delete(k);
      n++;
    }
  }
  return n;
}

export const ONE_HOUR = 60 * 60 * 1000;
export const FIFTEEN_MIN = 15 * 60 * 1000;

let lastForcedSyncAt = 0;

/**
 * Claims a forced-sync slot: returns true (and records "now") if it's been at
 * least `minIntervalMs` since the last forced sync, false otherwise. Used so
 * the manual refresh button can't clear the cache and hit every upstream API
 * more than once per interval, no matter how often it's clicked.
 */
export function tryClaimForceSync(minIntervalMs: number): boolean {
  const now = Date.now();
  if (lastForcedSyncAt > 0 && now - lastForcedSyncAt < minIntervalMs) return false;
  lastForcedSyncAt = now;
  return true;
}
