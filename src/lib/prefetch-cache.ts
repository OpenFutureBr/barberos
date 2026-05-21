// Cache em memória no lado do cliente — sobrevive à navegação entre páginas
// mas não a reloads. TTL padrão de 60 segundos.

type Entry = { data: any; timestamp: number }
const store = new Map<string, Entry>()

export function getCache(key: string, ttlMs = 60_000): any | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) { store.delete(key); return null }
  return entry.data
}

export function setCache(key: string, data: any): void {
  store.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
