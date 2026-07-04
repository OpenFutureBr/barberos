// Busca com cache "nunca piora" (stale-on-error): se a resposta falhar (rede
// caiu, pool de conexões esgotou, etc.) ou vier com { error }, devolve o
// último dado bom conhecido em vez de vazio/zero. Cache persiste no
// localStorage, então sobrevive a reload de página, não só a re-render.
//
// Uso: em vez de `fetch(url).then(r => r.json())`, usar `fetchJsonSafe(url)`.
// A tela nunca mostra "0" ou lista vazia por causa de uma falha transitória —
// só mostra vazio de verdade se nunca tiver havido uma resposta boa antes.

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`sfc:${key}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(`sfc:${key}`, JSON.stringify(data))
  } catch {
    // localStorage indisponível (modo privado, quota cheia) — segue sem cache
  }
}

function pareceValido(data: unknown): boolean {
  if (data === null || data === undefined) return false
  if (typeof data === "object" && "error" in (data as Record<string, unknown>)) return false
  return true
}

/**
 * Busca JSON com fallback para o último dado bom em cache quando a resposta
 * falha ou vem com erro. `cacheKey` default é a própria URL.
 */
export async function fetchJsonSafe<T = any>(url: string, cacheKey?: string): Promise<T | null> {
  const key = cacheKey ?? url

  try {
    const res = await fetch(url)
    const data = await res.json().catch(() => null)

    if (res.ok && pareceValido(data)) {
      writeCache(key, data)
      return data as T
    }

    return readCache<T>(key)
  } catch {
    return readCache<T>(key)
  }
}
