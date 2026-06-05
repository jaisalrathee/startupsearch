// Tiny TTL cache for slow-moving API aggregates. In dev runs in-process; on
// Cloudflare Workers each isolate has its own copy — fine for our needs since
// the values are stale-safe.

interface Entry<T> {
  expires: number
  value: T
}

const STORE = new Map<string, Entry<unknown>>()

export async function withTTL<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = STORE.get(key) as Entry<T> | undefined
  if (hit && hit.expires > now) return hit.value
  const value = await factory()
  STORE.set(key, { expires: now + ttlMs, value })
  return value
}
