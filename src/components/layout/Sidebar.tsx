"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"

const ic = (path: string, fill = false) => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
)

const menuGroups = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",           label: "Dashboard",        icon: ic("M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"), resource: "dashboard" },
      { href: "/dashboard/agenda",    label: "Agenda",           icon: ic("M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"), resource: "agenda" },
      { href: "/dashboard/fila",      label: "Fila de Espera",   icon: ic("M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"), resource: "fila" },
      { href: "/dashboard/painel-tv", label: "Painel TV",        icon: ic("M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z"), newTab: true, resource: "painel_tv", feature: "painel_tv" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/dashboard/clientes",    label: "Clientes",          icon: ic("M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"), resource: "clientes" },
      { href: "/dashboard/servicos",    label: "Serviços",          icon: ic("M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"), resource: "servicos" },
      { href: "/dashboard/galeria",     label: "Galeria de Cortes", icon: ic("M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664"), resource: "galeria" },
      { href: "/dashboard/equipe",      label: "Equipe",            icon: ic("M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"), resource: "equipe" },
      { href: "/dashboard/estoque",     label: "Estoque",           icon: ic("M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"), resource: "estoque" },
      { href: "/dashboard/estoque-ia",  label: "IA Estoque",        icon: ic("M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"), resource: "ia_estoque", feature: "ia" },
      { href: "/dashboard/domicilio",   label: "Domicílio",         icon: ic("M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"), resource: "domicilio" },
      { href: "/dashboard/ia-biotipo",  label: "IA Biotipo",        icon: ic("M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"), resource: "ia_biotipo", feature: "ia" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/dashboard/pix",          label: "PIX & Cobranças", icon: ic("M3.75 9h16.5m-16.5 6.75h16.5M6 3.75h.008v.008H6V3.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM6 12h.008v.008H6V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 6.75h.008v.008H6v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM6 3.75A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6z"), resource: "pix", feature: "financeiro" },
      { href: "/dashboard/caixa",        label: "Caixa",           icon: ic("M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"), resource: "caixa", feature: "financeiro" },
      { href: "/dashboard/financeiro",   label: "Financeiro",      icon: ic("M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"), resource: "financeiro", feature: "financeiro" },
      { href: "/dashboard/fiscal",       label: "Fiscal & NF-e",   icon: ic("M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"), resource: "fiscal", feature: "nfse" },
      { href: "/dashboard/precificacao", label: "Precificação",    icon: ic("M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z"), resource: "precificacao", feature: "financeiro" },
    ],
  },
  {
    label: "Fidelidade",
    items: [
      { href: "/dashboard/cashback",    label: "Cashback",    icon: ic("M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"), resource: "cashback", feature: "cashback" },
      { href: "/dashboard/assinaturas", label: "Assinaturas", icon: ic("M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"), resource: "assinaturas" },
      { href: "/dashboard/clientes-ia", label: "Central IA",  icon: ic("M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"), resource: "clientes_ia", feature: "ia" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: ic("M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"), resource: "whatsapp" },
    ],
  },
  {
    label: "Escala",
    items: [
      { href: "/dashboard/unidades",    label: "Multi-unidades", icon: ic("M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"), resource: "unidades", feature: "multiUnidade" },
      { href: "/dashboard/media",       label: "BarberOS Media", icon: ic("M3.75 19.5l6.75-6.75 2.25 2.25 3.75-3.75 4.5 4.5M21 12V6.75A2.25 2.25 0 0018.75 4.5H5.25A2.25 2.25 0 003 6.75v10.5A2.25 2.25 0 005.25 19.5H21"), resource: "media" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/configuracoes", label: "Configurações", icon: ic("M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28zM15 12a3 3 0 11-6 0 3 3 0 016 0z"), resource: "configuracoes" },
      { href: "/dashboard/permissoes",    label: "Permissões",    icon: ic("M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.169.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"), resource: "permissoes" },
      { href: "/dashboard/api-docs",      label: "API Docs",      icon: ic("M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"), resource: "api_docs", feature: "api" },
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
        // Prefer unit logo, fall back to org logo
        setLogoUrl(d?.logoUrl ?? d?.orgLogoUrl ?? null)
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
    <aside className="w-48 bg-zinc-900 border-r border-zinc-800 hidden md:flex flex-col h-screen fixed left-0 top-0 z-30">

      <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-amber-500 flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" data-no-invert />
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
                    {item.icon}
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
