"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ITENS_PALETA, buscar, itemPorPath, type ItemPaleta } from "@/lib/paleta"
import { usePermissoes } from "@/lib/usePermissoes"
import { useFavoritos, usePropsFavoritar } from "@/lib/useFavoritos"
import { ROTA_INICIAL } from "@/lib/navegacao"

// Busca global (Ctrl+K). Monta no shell do dashboard.
//
// Nao reimplementa nenhuma acao: navega com o router ou dispara os mesmos
// eventos de window que o Topbar/GlobalFAB ja disparam.

type Secao = { titulo: string; itens: ItemPaleta[] }

export default function PaletaComandos() {
  const [aberta, setAberta] = useState(false)
  const [busca, setBusca] = useState("")
  const [indice, setIndice] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const { temAcesso } = usePermissoes()
  const { favoritos, visitas, alternar, contarVisita, ehFavorito } = useFavoritos()
  const campoRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)

  // Conta a visita em QUALQUER navegacao, nao so pelas feitas na paleta — e o
  // que alimenta a secao "Frequentes" sem o usuario configurar nada.
  useEffect(() => {
    const item = itemPorPath(pathname)
    if (item) contarVisita(item.id)
  }, [pathname, contarVisita])

  // Abrir sempre comeca limpo. O reset mora aqui, no gesto que abre, e nao num
  // efeito que observa `aberta`: efeito cuja unica funcao e chamar setState
  // gera um render extra e some com a intencao.
  const abrir = useCallback(() => {
    setBusca("")
    setIndice(0)
    setAberta(true)
  }, [])

  // Ctrl+K / Cmd+K abre e fecha. O atalho vale mesmo com o foco num campo de
  // texto: e o comportamento que se espera de uma command palette.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (aberta) setAberta(false)
        else abrir()
      }
    }
    function aoAbrirPorEvento() { abrir() }
    window.addEventListener("keydown", aoTeclar)
    window.addEventListener("abrirBusca", aoAbrirPorEvento)
    return () => {
      window.removeEventListener("keydown", aoTeclar)
      window.removeEventListener("abrirBusca", aoAbrirPorEvento)
    }
  }, [aberta, abrir])

  // Foco no campo depois de abrir (efeito que mexe no DOM, nao em estado).
  useEffect(() => {
    if (!aberta) return
    const t = setTimeout(() => campoRef.current?.focus(), 20)
    return () => clearTimeout(t)
  }, [aberta])

  // Voltar/avancar do navegador com a paleta aberta tem que fechar. Observar
  // `pathname` num efeito resolveria, mas assinar popstate diz o que e:
  // reagir a uma acao externa, nao sincronizar estado derivado.
  useEffect(() => {
    const fechar = () => setAberta(false)
    window.addEventListener("popstate", fechar)
    return () => window.removeEventListener("popstate", fechar)
  }, [])

  const permitidos = useMemo(
    () => ITENS_PALETA.filter(i => temAcesso({ resource: i.resource, feature: i.feature })),
    [temAcesso],
  )

  const secoes = useMemo<Secao[]>(() => {
    const achados = buscar(permitidos, busca)

    // Digitando: uma lista unica, na ordem da pontuacao — agrupar aqui
    // esconderia o melhor resultado no meio de um grupo qualquer.
    if (busca.trim()) return [{ titulo: "Resultados", itens: achados.slice(0, 12) }]

    // Parada: atalhos primeiro, catalogo completo depois.
    const favs = permitidos.filter(i => favoritos.includes(i.id))
    const freq = permitidos
      .filter(i => (visitas[i.id] ?? 0) > 0 && !favoritos.includes(i.id))
      .sort((a, b) => (visitas[b.id] ?? 0) - (visitas[a.id] ?? 0))
      .slice(0, 5)
    const idsAtalho = new Set([...favs, ...freq].map(i => i.id))

    const out: Secao[] = []
    if (favs.length) out.push({ titulo: "Favoritos", itens: favs })
    if (freq.length) out.push({ titulo: "Frequentes", itens: freq })

    for (const grupo of [...new Set(permitidos.map(i => i.grupo))]) {
      const itens = permitidos.filter(i => i.grupo === grupo && !idsAtalho.has(i.id))
      if (itens.length) out.push({ titulo: grupo, itens })
    }
    return out
  }, [permitidos, busca, favoritos, visitas])

  // Lista achatada: a navegacao por teclado ignora os titulos de secao.
  const planos = useMemo(() => secoes.flatMap(s => s.itens), [secoes])

  // A lista encurta conforme o usuario digita, entao o indice guardado pode
  // ficar fora da faixa. Corrigir na LEITURA (em vez de num efeito que
  // reescreve o estado) evita o render a mais e nao perde a posicao quando a
  // lista volta a crescer.
  const indiceAtivo = planos.length ? Math.min(indice, planos.length - 1) : 0

  const executar = useCallback((item: ItemPaleta) => {
    setAberta(false)

    if (item.tipo === "navegacao" && item.path) {
      contarVisita(item.id)
      // Mesma regra dos menus: ver src/lib/navegacao.ts.
      if (pathname !== ROTA_INICIAL) router.replace(item.path)
      else router.push(item.path)
      return
    }

    if (!item.evento) return

    // Acao presa a uma pagina (ex.: "Novo produto", ouvido pela tela de
    // estoque): navega primeiro e dispara depois que a tela montou. Sem isso o
    // evento nao tem ninguem escutando e o clique nao faz nada.
    if (item.rotaNecessaria && !pathname.startsWith(item.rotaNecessaria)) {
      const evento = item.evento
      router.push(item.rotaNecessaria)
      setTimeout(() => window.dispatchEvent(new CustomEvent(evento)), 600)
      return
    }
    window.dispatchEvent(new CustomEvent(item.evento))
  }, [contarVisita, pathname, router])

  function aoTeclarNaPaleta(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); setAberta(false); return }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIndice(planos.length ? (indiceAtivo + 1) % planos.length : 0)
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setIndice(planos.length ? (indiceAtivo - 1 + planos.length) % planos.length : 0)
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const item = planos[indiceAtivo]
      if (item) executar(item)
    }
  }

  // Mantem o item destacado visivel ao andar com as setas.
  useEffect(() => {
    if (!aberta) return
    listaRef.current
      ?.querySelector<HTMLElement>(`[data-indice="${indiceAtivo}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [indiceAtivo, aberta])

  if (!aberta) return null

  let cursor = -1

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh] bg-black/60"
      onClick={() => setAberta(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-lg bg-surface-1 border border-line rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={aoTeclarNaPaleta}
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
      >
        <div className="flex items-center gap-2 px-4 border-b border-line">
          <svg className="w-4 h-4 text-fg-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={campoRef}
            value={busca}
            onChange={e => { setBusca(e.target.value); setIndice(0) }}
            placeholder="Buscar páginas e ações…"
            aria-label="Buscar"
            className="flex-1 bg-transparent text-fg text-base md:text-sm min-h-12 outline-none placeholder:text-fg-4"
          />
          <kbd className="hidden md:block text-fg-4 text-[10px] border border-line rounded px-1.5 py-0.5 flex-shrink-0">
            esc
          </kbd>
        </div>

        <div ref={listaRef} className="max-h-[55vh] overflow-y-auto py-1.5">
          {planos.length === 0 && (
            <p className="text-fg-3 text-sm text-center py-8">Nada encontrado para “{busca}”.</p>
          )}

          {secoes.map(secao => (
            <div key={secao.titulo}>
              <p className="text-fg-4 text-[10px] uppercase tracking-widest font-mono px-4 pt-2 pb-1">
                {secao.titulo}
              </p>
              {secao.itens.map(item => {
                cursor++
                return (
                  <LinhaPaleta
                    key={item.id}
                    item={item}
                    indice={cursor}
                    ativo={cursor === indiceAtivo}
                    favorito={ehFavorito(item.id)}
                    onExecutar={() => executar(item)}
                    onAlternarFavorito={() => alternar(item.id)}
                    onFocar={setIndice}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div className="border-t border-line px-4 py-2 flex items-center justify-between text-fg-4 text-[11px]">
          <span>↑↓ navegar · ↵ abrir</span>
          <span className="hidden md:inline">Botão direito favorita</span>
          <span className="md:hidden">Toque longo favorita</span>
        </div>
      </div>
    </div>
  )
}

function LinhaPaleta({
  item, indice, ativo, favorito, onExecutar, onAlternarFavorito, onFocar,
}: {
  item: ItemPaleta
  indice: number
  ativo: boolean
  favorito: boolean
  onExecutar: () => void
  onAlternarFavorito: () => void
  onFocar: (i: number) => void
}) {
  const { props, bloqueado } = usePropsFavoritar(onAlternarFavorito)

  return (
    <button
      type="button"
      data-indice={indice}
      onMouseMove={() => onFocar(indice)}
      // O toque longo tambem dispara click no fim; `bloqueado()` evita
      // favoritar e executar o item de uma vez.
      onClick={() => { if (!bloqueado()) onExecutar() }}
      {...props}
      className={`w-full flex items-center gap-2.5 px-4 min-h-11 text-left transition-colors ${
        ativo ? "bg-accent/10" : "hover:bg-surface-2"
      }`}
    >
      <span className={`text-xs flex-shrink-0 ${item.tipo === "acao" ? "text-accent" : "text-fg-4"}`}>
        {item.tipo === "acao" ? "▸" : "#"}
      </span>
      <span className={`flex-1 text-sm truncate ${ativo ? "text-fg font-medium" : "text-fg-2"}`}>
        {item.label}
      </span>
      {favorito && (
        <span className="text-accent text-xs flex-shrink-0" title="Favorito" aria-label="Favorito">★</span>
      )}
      <span className="text-fg-4 text-[10px] flex-shrink-0 hidden md:block">{item.grupo}</span>
    </button>
  )
}
