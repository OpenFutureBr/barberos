"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { MENU_GROUPS, type MenuGroup } from "@/lib/menu-items"

function Icon({ path, fill = false, size = 20 }: { path: string; fill?: boolean; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill={fill ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      strokeWidth={fill ? 0 : 1.8}
      stroke={fill ? "none" : "currentColor"}
      width={size}
      height={size}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

const BACK_ICON = "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"

export default function MobileNav() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [grupoAtivo, setGrupoAtivo] = useState<MenuGroup | null>(null)

  const allowedResources = (session?.user as any)?.allowedResources ?? []
  const planFeatures = (session?.user as any)?.planFeatures ?? []
  const isAdmin = allowedResources.includes("*")

  function temAcesso(resource: string, feature?: string): boolean {
    if (isAdmin) return true
    if (feature && !planFeatures.includes(feature)) return false
    return allowedResources.includes(resource)
  }

  // Fechar submenu ao navegar
  useEffect(() => {
    setGrupoAtivo(null)
  }, [pathname])

  const gruposVisiveis = MENU_GROUPS.filter(g =>
    g.items.some(item => temAcesso(item.resource, item.feature))
  )

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative overflow-hidden h-16">
        {/* Level 1 — Grupos */}
        <div
          className={`absolute inset-0 flex items-center transition-transform duration-300 ease-in-out ${
            grupoAtivo ? "-translate-x-full" : "translate-x-0"
          }`}
        >
          <div className="flex items-center w-full overflow-x-auto scrollbar-none px-1 gap-1">
            {gruposVisiveis.map(grupo => {
              const isActive = grupo.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))
              return (
                <button
                  key={grupo.label}
                  onClick={() => setGrupoAtivo(grupo)}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] h-14 px-1 rounded-lg transition-colors flex-shrink-0 ${
                    isActive
                      ? "text-white bg-zinc-800"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon path={grupo.groupIconPath} size={22} />
                  <span className="text-[10px] leading-none font-medium truncate max-w-[58px]">
                    {grupo.shortLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Level 2 — Itens do grupo */}
        <div
          className={`absolute inset-0 flex items-center transition-transform duration-300 ease-in-out ${
            grupoAtivo ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Botão voltar */}
          <button
            onClick={() => setGrupoAtivo(null)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] h-14 px-2 text-zinc-400 hover:text-white flex-shrink-0"
            aria-label="Voltar"
          >
            <Icon path={BACK_ICON} size={22} />
            <span className="text-[10px] leading-none font-medium">Voltar</span>
          </button>

          {/* Divisor */}
          <div className="w-px h-8 bg-zinc-700 flex-shrink-0" />

          {/* Itens do grupo */}
          <div className="flex items-center overflow-x-auto scrollbar-none px-1 gap-1 flex-1">
            {grupoAtivo?.items
              .filter(item => temAcesso(item.resource, item.feature))
              .map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.newTab ? "_blank" : undefined}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-14 px-1 rounded-lg transition-colors flex-shrink-0 ${
                      isActive
                        ? "text-white bg-zinc-800"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon path={item.iconPath} fill={item.fillIcon} size={22} />
                    <span className="text-[10px] leading-tight font-medium text-center max-w-[62px] line-clamp-2">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
          </div>
        </div>
      </div>
    </nav>
  )
}
