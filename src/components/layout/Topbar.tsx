"use client"

import { usePathname } from "next/navigation"

const titles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Dom, 05 Abr 2026" },
  "/dashboard/agenda": { title: "Agenda", subtitle: "Visão do dia" },
  "/dashboard/fila": { title: "Fila de Espera", subtitle: "Atualizado ao vivo" },
  "/dashboard/clientes": { title: "Clientes", subtitle: "247 cadastrados" },
  "/dashboard/galeria": { title: "Galeria de Cortes", subtitle: "MOD-02" },
  "/dashboard/equipe": { title: "Equipe", subtitle: "6 profissionais" },
  "/dashboard/estoque": { title: "Estoque & Produtos", subtitle: "MOD-05" },
  "/dashboard/domicilio": { title: "Domicílio", subtitle: "MOD-09 · Rota do dia" },
  "/dashboard/financeiro": { title: "Financeiro", subtitle: "Abril 2026" },
  "/dashboard/cashback": { title: "Cashback & Gift Cards", subtitle: "MOD-06" },
  "/dashboard/assinaturas": { title: "Assinaturas", subtitle: "18 assinantes" },
  "/dashboard/ia": { title: "Central IA", subtitle: "5 alertas ativos" },
}

export default function Topbar({ onAbrirModal }: { onAbrirModal: () => void }) {
  const pathname = usePathname()
  const current = titles[pathname] ?? { title: "BarberOS", subtitle: "" }

  return (
    <header className="h-11 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-3 fixed top-0 left-48 right-0 z-20">
      <div className="flex-1">
        <span className="text-white text-sm font-bold">{current.title}</span>
        {current.subtitle && (
          <span className="text-zinc-500 text-xs ml-2">{current.subtitle}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
          ● Aberto
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Plano Pro
        </span>
        <button
          onClick={onAbrirModal}
          className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          + Agendar
        </button>
      </div>
    </header>
  )
}