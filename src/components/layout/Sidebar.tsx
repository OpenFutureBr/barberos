"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"

// feature: qual feature do plano é necessária para ver este item
// undefined = disponível em todos os planos
const menuGroups = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",           label: "Dashboard",        icon: "◈", resource: "dashboard" },
      { href: "/dashboard/agenda",    label: "Agenda",           icon: "◷", resource: "agenda" },
      { href: "/dashboard/fila",      label: "Fila de Espera",   icon: "●", resource: "fila" },
      { href: "/dashboard/painel-tv", label: "Painel TV",        icon: "📺", newTab: true, resource: "painel_tv", feature: "painel_tv" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/dashboard/clientes",    label: "Clientes",          icon: "◎", resource: "clientes" },
      { href: "/dashboard/servicos",    label: "Serviços",          icon: "◈", resource: "servicos" },
      { href: "/dashboard/galeria",     label: "Galeria de Cortes", icon: "✂", resource: "galeria" },
      { href: "/dashboard/equipe",      label: "Equipe",            icon: "◉", resource: "equipe" },
      { href: "/dashboard/estoque",     label: "Estoque",           icon: "◈", resource: "estoque" },
      { href: "/dashboard/estoque-ia",  label: "IA Estoque",        icon: "⬡", resource: "ia_estoque", feature: "ia" },
      { href: "/dashboard/domicilio",   label: "Domicílio",         icon: "🚗", resource: "domicilio" },
      { href: "/dashboard/ia-biotipo",  label: "IA Biotipo",        icon: "🤖", resource: "ia_biotipo", feature: "ia" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/dashboard/pix",          label: "PIX & Cobranças", icon: "💸", resource: "pix",          feature: "financeiro" },
      { href: "/dashboard/caixa",        label: "Caixa",           icon: "💰", resource: "caixa",        feature: "financeiro" },
      { href: "/dashboard/financeiro",   label: "Financeiro",      icon: "◷", resource: "financeiro",   feature: "financeiro" },
      { href: "/dashboard/fiscal",       label: "Fiscal & NF-e",   icon: "📄", resource: "fiscal",       feature: "nfse" },
      { href: "/dashboard/precificacao", label: "Precificação",    icon: "🏷", resource: "precificacao", feature: "financeiro" },
    ],
  },
  {
    label: "Fidelidade",
    items: [
      { href: "/dashboard/cashback",    label: "Cashback",    icon: "✦", resource: "cashback",    feature: "cashback" },
      { href: "/dashboard/assinaturas", label: "Assinaturas", icon: "◎", resource: "assinaturas" },
      { href: "/dashboard/clientes-ia", label: "Central IA",  icon: "⬡", resource: "clientes_ia", feature: "ia" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: "💬", resource: "whatsapp" },
    ],
  },
  {
    label: "Escala",
    items: [
      { href: "/dashboard/unidades",    label: "Multi-unidades", icon: "🏢", resource: "unidades",    feature: "multiUnidade" },
      { href: "/dashboard/white-label", label: "White-label",   icon: "🎨", resource: "white_label" },
      { href: "/dashboard/media",       label: "BarberOS Media", icon: "📡", resource: "media" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/configuracoes", label: "Configurações", icon: "⚙", resource: "configuracoes" },
      { href: "/dashboard/api-docs",      label: "API Docs",      icon: "📡", resource: "api_docs", feature: "api" },
    ],
  },
]

const SCROLL_KEY = "sidebar-scroll"
const COLLAPSED_KEY = "sidebar-collapsed"

export default function Sidebar() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const { data: session } = useSession()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [estabNome, setEstabNome] = useState("BarberOS")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [tema, setTema] = useState<"dark" | "light">("dark")

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.allowedResources?.includes("*")
  const allowedResources = session?.user?.allowedResources ?? []
  const planFeatures = session?.user?.planFeatures ?? []

  function podeVer(resource: string) {
    if (!session) return true
    if (isAdmin) return true
    return allowedResources.includes(resource)
  }

  function planoPermite(feature?: string) {
    if (!feature) return true           // sem restrição de plano
    if (!session) return true           // antes de carregar
    if (isAdmin) return true            // admin vê tudo
    if (planFeatures.includes("*")) return true
    return planFeatures.includes(feature)
  }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(COLLAPSED_KEY)
      if (saved) setCollapsed(new Set(JSON.parse(saved)))
    } catch {}
    try {
      const t = (localStorage.getItem("tema") as "dark" | "light") ?? "dark"
      setTema(t)
      if (t === "light") document.documentElement.classList.add("light")
      else document.documentElement.classList.remove("light")
    } catch {}
  }, [])

  function setTemaValor(novo: "dark" | "light") {
    setTema(novo)
    localStorage.setItem("tema", novo)
    if (novo === "light") document.documentElement.classList.add("light")
    else document.documentElement.classList.remove("light")
    window.dispatchEvent(new CustomEvent("temaAlterado", { detail: novo }))
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved && navRef.current) {
      navRef.current.scrollTop = parseInt(saved, 10)
    }
  }, [pathname])

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
    fetch("/api/configuracoes")
      .then(r => r.json())
      .then(d => {
        if (d?.logoUrl) setLogoUrl(d.logoUrl)
        if (d?.name) setEstabNome(d.name)
      })
      .catch(() => {})

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

  const nomeUsuario = session?.user?.name ?? "Usuário"
  const inicialUsuario = nomeUsuario.charAt(0).toUpperCase()
  const usernameUsuario = session?.user?.username ?? ""
  const roleLabel: Record<string, string> = {
    ADMIN: "Admin", MANAGER: "Gerente", BARBER_CLT: "Barbeiro",
    BARBER_MEI: "Barbeiro MEI", AUTONOMO: "Autônomo", CLIENT: "Cliente",
  }
  const papelUsuario = roleLabel[session?.user?.role ?? ""] ?? session?.user?.role ?? "—"

  return (
    <aside className="w-48 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed left-0 top-0 z-30">

      <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-amber-500 flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" data-no-invert />
          ) : (
            <span className="text-black font-bold text-sm">{estabNome.charAt(0) || "B"}</span>
          )}
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-tight truncate max-w-[110px]">{estabNome}</div>
          <div className="text-zinc-500 text-xs font-mono">v1.3 · PRD</div>
        </div>
      </div>

      {/* Usuário logado */}
      <div className="mx-2 mt-2 bg-zinc-800 rounded-lg p-2 flex items-center gap-2 border border-zinc-700">
        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
          {inicialUsuario}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">{nomeUsuario.split(" ")[0]}</div>
          <div className="text-zinc-500 text-xs truncate">{papelUsuario}</div>
        </div>
      </div>

      <nav ref={navRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-2">
        {menuGroups.map((group) => {
          const itensFiltrados = group.items.filter(i =>
            podeVer(i.resource) && planoPermite((i as any).feature)
          )
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
                    target={(item as any).newTab ? "_blank" : undefined}
                    rel={(item as any).newTab ? "noopener noreferrer" : undefined}
                    className={`flex items-center gap-2 mx-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-xs w-3.5 text-center flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Toggle de tema */}
      <div className="px-2 pb-1">
        <div className="relative flex bg-zinc-800 rounded-lg p-0.5 border border-zinc-700/50">
          <div
            className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md bg-zinc-700 transition-transform duration-300 ease-in-out"
            style={{ transform: tema === "dark" ? "translateX(calc(100% + 4px))" : "translateX(0)" }}
          />
          <button
            type="button"
            onClick={() => setTemaValor("light")}
            className={`relative z-10 flex-1 flex justify-center items-center py-1.5 transition-colors duration-200 ${tema === "light" ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}
            title="Tema claro"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setTemaValor("dark")}
            className={`relative z-10 flex-1 flex justify-center items-center py-1.5 transition-colors duration-200 ${tema === "dark" ? "text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
            title="Tema escuro"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        </div>
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
      </div>

    </aside>
  )
}
