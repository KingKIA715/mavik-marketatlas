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

export const ONE_HOUR = 60 * 60 * 1000;
export const FIFTEEN_MIN = 15 * 60 * 1000;
