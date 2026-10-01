"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import DrawerNav from "./DrawerNav"
import { usePermissoes } from "@/lib/usePermissoes"
import { useSubstituirHistorico } from "@/lib/navegacao"

const NOMES: Record<string, string> = {
  "/dashboard":               "Dashboard",
  "/dashboard/agenda":        "Agenda",
  "/dashboard/fila":          "Fila de Espera",
  "/dashboard/clientes":      "Clientes",
  "/dashboard/equipe":        "Equipe",
  "/dashboard/estoque":       "Estoque & Produtos",
  "/dashboard/domicilio":     "Domicílio",
  "/dashboard/financeiro":    "Financeiro",
  "/dashboard/cashback":      "Cashback & Gift Cards",
  "/dashboard/assinaturas":   "Assinaturas",
  "/dashboard/ia-biotipo":    "Central IA",
  "/dashboard/servicos":      "Serviços",
  "/dashboard/unidades":      "Unidades",
  "/dashboard/white-label":   "White Label",
  "/dashboard/whatsapp":      "WhatsApp",
  "/dashboard/pix":           "PIX",
  "/dashboard/precificacao":  "Precificação",
  "/dashboard/fiscal":        "Fiscal",
  "/alterar-senha":           "Alterar Senha",
}

export default function Topbar({
  onAbrirModal,
  onAbrirVenda,
  cartCount = 0,
}: {
  onAbrirModal: () => void
  onAbrirVenda: () => void
  cartCount?: number
}) {
  const pathname = usePathname()
  const [dataAtual, setDataAtual] = useState("")
  const [drawerAberto, setDrawerAberto] = useState(false)
  const { temAcesso } = usePermissoes()
  const substituirHistorico = useSubstituirHistorico()
  const verWhatsApp = temAcesso({ resource: "whatsapp" })

  useEffect(() => {
    const atualizar = () => {
      const d = new Date()
      setDataAtual(
        d.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      )
    }
    atualizar()
    const t = setInterval(atualizar, 60_000)
    return () => clearInterval(t)
  }, [])

  const nome = NOMES[pathname] ?? "BarberOS"

  return (
    <>
      <DrawerNav aberto={drawerAberto} onFechar={() => setDrawerAberto(false)} />
      {/* A altura embute o inset do topo (ver --h-topbar no globals.css): a
          barra encosta no notch em vez de ficar escondida atras dele. */}
      <header className="h-[var(--h-topbar)] pt-[var(--sa-top)] pl-[var(--pad-left)] pr-[var(--pad-right)] bg-zinc-900 border-b border-zinc-800 flex items-center gap-3 fixed top-0 left-0 md:left-48 right-0 z-20">
      {/* Hamburguer — apenas mobile */}
      <button
        onClick={() => setDrawerAberto(true)}
        className="md:hidden text-zinc-400 hover:text-white transition-colors flex-shrink-0"
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <div className="flex-1 flex items-baseline gap-2 min-w-0">
        <span className="text-white text-sm font-bold truncate">{nome}</span>
        {dataAtual && (
          <span className="hidden md:inline text-zinc-500 text-xs capitalize">{dataAtual}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Gatilho da busca global. O atalho funciona sem ele; o botao existe
            pra quem nao descobre Ctrl+K — e no mobile e o unico acesso. */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("abrirBusca"))}
          aria-label="Buscar (Ctrl+K)"
          title="Buscar (Ctrl+K)"
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-md px-2 py-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <kbd className="hidden lg:inline text-[10px] text-zinc-500 font-sans">Ctrl+K</kbd>
        </button>

        {/* Atalho pro modulo de WhatsApp. Segue as mesmas permissoes do menu. */}
        {verWhatsApp && (
          <Link
            href="/dashboard/whatsapp"
            replace={substituirHistorico}
            aria-label="WhatsApp"
            title="WhatsApp"
            className={`flex items-center justify-center border rounded-md px-2 py-1.5 transition-colors ${
              pathname.startsWith("/dashboard/whatsapp")
                ? "bg-green-500/15 border-green-500/40 text-green-400"
                : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400 hover:text-green-400"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.43 9.43 0 01-4.8-1.32l-.35-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 01-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44a9.38 9.38 0 016.68 2.77 9.38 9.38 0 012.76 6.68c0 5.2-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0012.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.7l6.1-1.6a11.33 11.33 0 005.37 1.37h.01c6.26 0 11.36-5.1 11.37-11.37 0-3.03-1.18-5.89-3.34-8.03z" />
            </svg>
          </Link>
        )}

        <button
          onClick={onAbrirVenda}
          title={cartCount > 0 ? `${cartCount} ${cartCount === 1 ? "item" : "itens"} no carrinho` : "Registrar venda"}
          className="relative bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm px-2.5 py-1.5 rounded-md transition-colors"
        >
          🛒
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </button>

        <button
          onClick={onAbrirModal}
          className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          + Agendar
        </button>
      </div>
    </header>
    </>
  )
}
