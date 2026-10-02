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

// Buscas em andamento, por chave. Sidebar, shell e modais pedem os mesmos
// dados (configurações, equipe, clientes) ao mesmo tempo ao abrir o painel —
// sem isto, cada um disparava a sua requisição antes de o cache existir.
const emVoo = new Map<string, Promise<unknown>>()

/**
 * fetch + JSON com cache (TTL) e deduplicação: quem pedir a mesma chave
 * enquanto a primeira busca não voltou recebe a mesma Promise. Respostas com
 * { error } não entram no cache.
 */
// T padrão any: mesmo contrato do getCache, os chamadores leem campos da resposta
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fetchCached<T = any>(key: string, url: string, ttlMs = 60_000): Promise<T> {
  const hit = getCache(key, ttlMs)
  if (hit) return Promise.resolve(hit as T)
  const chave = chaveComEscopo(key)
  const pendente = emVoo.get(chave)
  if (pendente) return pendente as Promise<T>
  const p = fetch(url)
    .then(r => r.json())
    .then(d => {
      // Só grava se o escopo não mudou no meio do caminho
      if (d && !d.error && chaveComEscopo(key) === chave) setCache(key, d)
      return d
    })
    .finally(() => emVoo.delete(chave))
  emVoo.set(chave, p)
  return p as Promise<T>
}

export function invalidateCache(prefix: string): void {
  const prefixoComEscopo = chaveComEscopo(prefix)
  for (const key of store.keys()) {
    if (key.startsWith(prefixoComEscopo)) store.delete(key)
  }
}
