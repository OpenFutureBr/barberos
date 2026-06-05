/**
 * Cache com Upstash Redis.
 *
 * Se UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN não estiverem
 * configurados, usa um Map em memória como fallback (útil em dev).
 * Em produção configure as variáveis no .env para cache distribuído.
 */

import { Redis } from "@upstash/redis"

// ── Cliente ───────────────────────────────────────────────────────────────────

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

// ── Fallback em memória (dev sem Redis) ───────────────────────────────────────

const memCache = new Map<string, { value: unknown; expiresAt: number }>()

// ── API pública ───────────────────────────────────────────────────────────────

/** Lê um valor do cache. Retorna null se expirado ou não existir. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis()
  if (r) {
    try { return await r.get<T>(key) } catch { /* degradação silenciosa */ }
  }
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null }
  return entry.value as T
}

/** Salva um valor com TTL em segundos. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = getRedis()
  if (r) {
    try { await r.setex(key, ttlSeconds, value); return } catch { /* degradação silenciosa */ }
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

/** Remove uma chave do cache (invalidação pontual). */
export async function cacheDel(key: string): Promise<void> {
  const r = getRedis()
  if (r) { try { await r.del(key) } catch {} }
  memCache.delete(key)
}

/** Remove todas as chaves que começam com um prefixo. */
export async function cacheDelPrefix(prefix: string): Promise<void> {
  const r = getRedis()
  if (r) {
    try {
      const keys = await r.keys(`${prefix}*`)
      if (keys.length > 0) await r.del(...keys)
    } catch {}
  }
  for (const k of memCache.keys()) {
    if (k.startsWith(prefix)) memCache.delete(k)
  }
}

/** Helper: lê do cache ou executa a função e armazena o resultado. */
export async function cacheOr<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached
  const result = await fn()
  await cacheSet(key, result, ttlSeconds)
  return result
}
