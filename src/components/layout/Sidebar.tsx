"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { MENU_GROUPS } from "@/lib/menu-items"
import { getCache, setCache } from "@/lib/prefetch-cache"
import { ControleTema } from "@/components/ui/SeletorTema"
import { usePermissoes } from "@/lib/usePermissoes"

const ic = (path: string, fill = false) => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
)

const SCROLL_KEY = "sidebar-scroll"
const COLLAPSED_KEY = "sidebar-collapsed"

// A imagem fica em cache por 1 ano (ver supabase-storage.ts) — o ?v= usa o
// updatedAt do registro pra trocar a URL sempre que a foto for atualizada,
// em vez de depender do cache expirar.
function fotoComVersao(url: string | null | undefined, updatedAt: string | null | undefined) {
  if (!url || !updatedAt) return url ?? null
  return `${url}${url.includes("?") ? "&" : "?"}v=${new Date(updatedAt).getTime()}`
}

export default function Sidebar() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const { data: session } = useSession()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [estabNome, setEstabNome] = useState("BarberOS")
  // Todos os grupos carregam condensados por padrão — só expande quando o
  // usuário clica (preferência fica salva na sessionStorage abaixo).
  //
  // O estado inicial é DETERMINÍSTICO de propósito: ler a sessionStorage aqui
  // (lazy init) fazia o cliente renderizar um menu diferente do servidor, e o
  // desencontro subia até o <html>. Em produção o React recriava o elemento
  // (erro #418) e levava embora os data-mode/data-accent/data-tone que o
  // script de boot havia posto — então, depois de o usuário expandir um grupo
  // uma única vez, toda recarga voltava a pintar no tema padrão. A preferência
  // salva é aplicada no useLayoutEffect abaixo, antes do paint.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(MENU_GROUPS.map(g => g.label)),
  )

  const { itensVisiveis } = usePermissoes()

  // Restaura, antes do primeiro paint, os grupos expandidos e o scroll do menu.
  // Em duas passadas: aplicar os grupos muda a altura do <nav>, e o scroll só
  // pode ser reposto depois que essa altura já está no DOM — senão a posição
  // salva não existe ainda e o menu fica travado no topo.
  //
  // Só precisa rodar na montagem: com o shell em (shell)/layout.tsx o <nav>
  // não é desmontado a cada navegação, então o scroll se mantém sozinho.
  const restauracaoFeita = useRef(false)
  useLayoutEffect(() => {
    if (restauracaoFeita.current) return

    let salvos: Set<string> | null = null
    try {
      const bruto = sessionStorage.getItem(COLLAPSED_KEY)
      if (bruto) salvos = new Set<string>(JSON.parse(bruto))
    } catch {}

    const precisaAplicar =
      salvos !== null &&
      (salvos.size !== collapsed.size || [...salvos].some(l => !collapsed.has(l)))
    if (precisaAplicar) {
      setCollapsed(salvos!)
      return // volta aqui na próxima passada, já com a altura final
    }

    restauracaoFeita.current = true
    const y = sessionStorage.getItem(SCROLL_KEY)
    if (y && navRef.current) navRef.current.scrollTop = parseInt(y, 10)
  }, [collapsed])

  function handleScroll() {
    if (navRef.current) {
      sessionStorage.setItem(SCROLL_KEY, String(navRef.current.scrollTop))
    }
  }

  function toggleGroup(label: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      sessionStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]))
      return next
    })
  }

  useEffect(() => {
    const aplicar = (d: any) => {
      // Prefer unit logo, fall back to org logo
      setLogoUrl(fotoComVersao(d?.logoUrl ?? d?.orgLogoUrl ?? null, d?.updatedAt))
      if (d?.name) setEstabNome(d.name)
    }

    const cfgCache = getCache("configuracoes")
    if (cfgCache) {
      aplicar(cfgCache)
    } else {
      fetch("/api/configuracoes")
        .then(r => r.json())
        .then(d => { if (!d.error) setCache("configuracoes", d); aplicar(d) })
        .catch(() => {})
    }

    function onLogo(e: Event) { setLogoUrl((e as CustomEvent).detail) }
    function onEstab(e: Event) {
      const d = (e as CustomEvent).detail
      if (d?.name) setEstabNome(d.name)
      if (d?.logoUrl) setLogoUrl(d.logoUrl)
    }
    window.addEventListener("logoAtualizada", onLogo)
    window.addEventListener("estabelecimentoAtualizado", onEstab)
    return () => {
      window.removeEventListener("logoAtualizada", onLogo)
      window.removeEventListener("estabelecimentoAtualizado", onEstab)
    }
  }, [])

  const usernameUsuario = session?.user?.username ?? ""

  return (
    <aside className="w-48 bg-zinc-900 border-r border-zinc-800 hidden md:flex flex-col h-screen fixed left-0 top-0 z-30">

      <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-amber-500 flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-black font-bold text-sm">{estabNome.charAt(0) || "B"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm tracking-tight truncate max-w-[110px]">{estabNome}</div>
          <div className="text-zinc-500 text-xs font-mono">v1.3 · PRD</div>
        </div>
        {(session?.user?.role === "ORG_OWNER" || session?.user?.role === "ORG_MANAGER") && (
          <Link href="/dashboard/unidades" title="Trocar unidade" className="text-zinc-600 hover:text-amber-400 transition-colors flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
          </Link>
        )}
      </div>

      {/* Unidade ativa */}
      <div className="mx-2 mt-2 bg-zinc-800 rounded-lg p-2 flex items-center gap-2 border border-zinc-700">
        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
          {(estabNome.charAt(0) || "U").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-zinc-500 text-xs truncate">Unidade</div>
          <div className="text-white text-xs font-medium truncate">{estabNome}</div>
        </div>
      </div>

      <nav ref={navRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-2">
        {MENU_GROUPS.map((group) => {
          const itensFiltrados = itensVisiveis(group)
          if (itensFiltrados.length === 0) return null
          const isCollapsed = collapsed.has(group.label)
          const hasActive = itensFiltrados.some(i => i.href === pathname)
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 pt-3 pb-1 group"
              >
                <span className={`text-xs font-mono uppercase tracking-widest transition-colors ${isCollapsed && hasActive ? "text-amber-500/70" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                  {group.label}
                </span>
                <span className={`text-zinc-600 group-hover:text-zinc-400 transition-all text-xs leading-none ${isCollapsed ? "" : "rotate-90"}`}
                  style={{ display: "inline-block", transition: "transform 0.15s" }}>
                  ›
                </span>
              </button>
              {!isCollapsed && itensFiltrados.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.newTab ? "_blank" : undefined}
                    rel={item.newTab ? "noopener noreferrer" : undefined}
                    className={`flex items-center gap-2 mx-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    {ic(item.iconPath, item.fillIcon)}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Aparencia: modo claro/escuro/sistema + cor e tonalidade */}
      <div className="px-2 pb-1">
        <ControleTema />
      </div>

      {/* Sair */}
      <div className="p-2 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-red-400 text-xs transition-colors"
        >
          <span className="text-sm">↩</span>
          <span>Sair ({usernameUsuario})</span>
        </button>
        <div className="text-center mt-2 pt-2 border-t border-zinc-800/60">
          <div className="text-zinc-600 text-[11px] font-medium">BarberOS</div>
          <div className="text-zinc-700 text-[10px]">Desenvolvido por OpenFuture</div>
        </div>
      </div>

    </aside>
  )
}
