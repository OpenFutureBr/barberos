"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { MENU_GROUPS, type MenuGroup } from "@/lib/menu-items"
import { usePermissoes } from "@/lib/usePermissoes"
import { useSubstituirHistorico } from "@/lib/navegacao"

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

/* ---------------------------------------------------------------------------
   Nav inferior do celular. Tocar num grupo abre uma folha PARA CIMA, acima da
   propria barra, em vez do deslize lateral que havia antes: o gesto natural
   num rodape e o menu subir, e a grade mostra os itens do grupo de uma vez,
   sem arrastar de lado pra descobrir o que existe.

   A barra continua visivel com a folha aberta (o grupo aberto fica destacado),
   entao da pra trocar de grupo direto, sem fechar antes.
   --------------------------------------------------------------------------- */
export default function MobileNav() {
  const pathname = usePathname()
  const [grupoAberto, setGrupoAberto] = useState<MenuGroup | null>(null)

  const { temAcesso, gruposVisiveis } = usePermissoes()
  const substituirHistorico = useSubstituirHistorico()
  const grupos = gruposVisiveis(MENU_GROUPS)

  // Enquanto a folha estiver aberta, o conteudo atras nao rola.
  useEffect(() => {
    if (!grupoAberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape") setGrupoAberto(null) }
    window.addEventListener("keydown", aoTeclar)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener("keydown", aoTeclar)
    }
  }, [grupoAberto])

  const itens = grupoAberto?.items.filter(temAcesso) ?? []

  return (
    // Com a folha aberta a barra sobe pra z-50: o FAB global e z-40 e flutua
    // justamente sobre a area onde a folha aparece — ele ficava por cima e
    // engolia os toques nos itens do menu.
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 pb-[var(--sa-bottom)] pl-[var(--sa-left)] pr-[var(--sa-right)] bg-zinc-900 border-t border-zinc-800 ${grupoAberto ? "z-50" : "z-40"}`}>
      {/* Fundo escuro: fecha ao tocar fora. Fica dentro da <nav> pra herdar o
          z-index dela e continuar ABAIXO da barra e da folha. */}
      {grupoAberto && (
        <div
          className="fixed inset-0 bg-black/60 -z-10"
          onClick={() => setGrupoAberto(null)}
          aria-hidden
        />
      )}

      {/* Folha — ancorada em bottom-full, ou seja, encostada no topo da barra */}
      <div
        className={`absolute bottom-full left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-2xl shadow-2xl shadow-black/50 origin-bottom transition-all duration-200 ease-out ${
          grupoAberto ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        {/* Alcinha, como em qualquer bottom sheet */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-9 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-zinc-300 text-xs font-semibold uppercase tracking-widest">
            {grupoAberto?.label}
          </span>
          <button
            onClick={() => setGrupoAberto(null)}
            aria-label="Fechar menu"
            className="text-zinc-500 hover:text-white w-8 h-8 -mr-2 flex items-center justify-center rounded-lg"
          >
            <Icon path="M6 6l12 12M18 6L6 18" size={16} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 px-2 pb-3 max-h-[50vh] overflow-y-auto">
          {itens.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                replace={substituirHistorico}
                target={item.newTab ? "_blank" : undefined}
                // Fecha no clique em vez de num efeito que observa o pathname:
                // assim nao ha setState dentro de efeito (regra do React 19) e
                // a folha some junto com o toque, sem esperar a rota trocar.
                onClick={() => setGrupoAberto(null)}
                className={`flex flex-col items-center justify-start gap-1 min-h-[72px] py-2 px-1 rounded-xl transition-colors ${
                  isActive ? "text-white bg-zinc-800" : "text-zinc-400 active:bg-zinc-800/60"
                }`}
              >
                <Icon path={item.iconPath} fill={item.fillIcon} size={22} />
                <span className="text-[10px] leading-tight font-medium text-center line-clamp-2">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Barra — sempre visivel */}
      <div className="flex items-center h-16 overflow-x-auto scrollbar-none px-1 gap-1">
        {grupos.map(grupo => {
          const naRota = grupo.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))
          const aberto = grupoAberto?.label === grupo.label
          return (
            <button
              key={grupo.label}
              onClick={() => setGrupoAberto(aberto ? null : grupo)}
              aria-expanded={aberto}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] h-14 px-1 rounded-lg transition-colors flex-shrink-0 ${
                aberto || naRota
                  ? "text-white bg-zinc-800"
                  : "text-zinc-400 active:bg-zinc-800/60"
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
    </nav>
  )
}
