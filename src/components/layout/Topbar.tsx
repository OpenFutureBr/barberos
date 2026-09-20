"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import DrawerNav from "./DrawerNav"

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
      <header className="h-11 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-3 fixed top-0 left-0 md:left-48 right-0 z-20">
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
