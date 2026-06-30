"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { MENU_GROUPS } from "@/lib/menu-items"

const ic = (path: string, fill = false) => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
)

export default function DrawerNav({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.allowedResources?.includes("*")
  const allowedResources = session?.user?.allowedResources ?? []
  const planFeatures = session?.user?.planFeatures ?? []

  function podeVer(resource: string) {
    if (!session) return true
    if (isAdmin) return true
    return allowedResources.includes(resource)
  }

  function planoPermite(feature?: string) {
    if (!feature) return true
    if (!session) return true
    if (isAdmin) return true
    if (planFeatures.includes("*")) return true
    return planFeatures.includes(feature)
  }

  // Fechar ao navegar
  useEffect(() => { onFechar() }, [pathname])

  // Bloquear scroll do body quando aberto
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [aberto])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${aberto ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onFechar}
      />

      {/* Drawer */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 w-72 bg-zinc-900 border-r border-zinc-800 z-50 flex flex-col transition-transform duration-300 ease-in-out ${aberto ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-white font-bold text-sm">Menu</span>
          <button onClick={onFechar} className="text-zinc-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {MENU_GROUPS.map(group => {
            const itens = group.items.filter(i => podeVer(i.resource) && planoPermite(i.feature))
            if (itens.length === 0) return null
            return (
              <div key={group.label}>
                <div className="px-4 pt-3 pb-1 text-zinc-600 text-xs font-mono uppercase tracking-widest">{group.label}</div>
                {itens.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <Link key={item.href} href={item.href}
                      target={item.newTab ? "_blank" : undefined}
                      rel={item.newTab ? "noopener noreferrer" : undefined}
                      className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      }`}>
                      {ic(item.iconPath, item.fillIcon)}
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Sair */}
        <div className="p-3 border-t border-zinc-800">
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400 text-sm transition-colors">
            <span>↩</span>
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  )
}
