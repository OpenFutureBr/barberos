// Cache em memória no lado do cliente — sobrevive à navegação entre páginas
// mas não a reloads. TTL padrão de 60 segundos.
//
// Toda entrada é namespaced por organização+unidade (ver setCacheScope). Isso
// evita que dado de uma unidade vaze pra outra caso a sessão troque de
// estabelecimento sem um reload completo da página — a chave antiga some do
// escopo novo, então nunca é servida por engano.

type Entry = { data: any; timestamp: number }
const store = new Map<string, Entry>()

let escopoAtual = "sem-sessao"

export function setCacheScope(establishmentId?: string | null, organizationId?: string | null): void {
  const novo = `${organizationId ?? "-"}::${establishmentId ?? "-"}`
  if (novo !== escopoAtual) store.clear()
  escopoAtual = novo
}

function chaveComEscopo(key: string): string {
  return `${escopoAtual}::${key}`
}

export function getCache(key: string, ttlMs = 60_000): any | null {
  const chave = chaveComEscopo(key)
  const entry = store.get(chave)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) { store.delete(chave); return null }
  return entry.data
}

export function setCache(key: string, data: any): void {
  store.set(chaveComEscopo(key), { data, timestamp: Date.now() })
}

export function invalidateCache(prefix: string): void {
  const prefixoComEscopo = chaveComEscopo(prefix)
  for (const key of store.keys()) {
    if (key.startsWith(prefixoComEscopo)) store.delete(key)
  }
}
