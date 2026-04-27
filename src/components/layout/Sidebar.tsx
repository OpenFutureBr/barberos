"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const menuGroups = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "◈" },
      { href: "/dashboard/agenda", label: "Agenda", icon: "◷" },
      { href: "/dashboard/fila", label: "Fila de Espera", icon: "●" },
      { href: "/dashboard/painel-tv", label: "Painel TV", icon: "📺" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/dashboard/clientes", label: "Clientes", icon: "◎" },
      { href: "/dashboard/servicos", label: "Serviços", icon: "◈" },
      { href: "/dashboard/galeria", label: "Galeria de Cortes", icon: "✂" },
      { href: "/dashboard/equipe", label: "Equipe", icon: "◉" },
      { href: "/dashboard/estoque", label: "Estoque", icon: "◈" },
      { href: "/dashboard/domicilio", label: "Domicílio", icon: "🚗" },
      { href: "/dashboard/ia-biotipo", label: "IA Biotipo", icon: "🤖" },
      
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/dashboard/pix", label: "PIX & Cobranças", icon: "💸" },
      { href: "/dashboard/caixa", label: "Caixa", icon: "💰" },
      { href: "/dashboard/financeiro", label: "Financeiro", icon: "◷" },
    ],
  },
  {
    label: "Fidelidade",
    items: [
      { href: "/dashboard/cashback", label: "Cashback", icon: "✦" },
      { href: "/dashboard/assinaturas", label: "Assinaturas", icon: "◎" },
      { href: "/dashboard/clientes-ia", label: "Central IA", icon: "⬡" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/configuracoes", label: "Configurações", icon: "⚙" },
      { href: "/dashboard/api-docs", label: "API Docs", icon: "📡" },
      { href: "/dashboard/white-label", label: "White-label", icon: "🎨" },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-48 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed left-0 top-0 z-30">

      <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-black font-bold text-sm">B</span>
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-tight">BarberOS</div>
          <div className="text-zinc-500 text-xs font-mono">v1.3 · PRD</div>
        </div>
      </div>

      <div className="mx-2 mt-2 bg-zinc-800 rounded-lg p-2 flex items-center gap-2 border border-zinc-700">
        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
          A
        </div>
        <div>
          <div className="text-white text-xs font-medium">Admin</div>
          <div className="text-zinc-500 text-xs">Dono</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pt-3 pb-1 text-zinc-600 text-xs font-mono uppercase tracking-widest">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
        ))}
      </nav>

      <div className="p-2 border-t border-zinc-800">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800 cursor-pointer">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
          <div>
            <div className="text-zinc-300 text-xs">Barbearia Costa</div>
            <div className="text-zinc-600 text-xs">Vila Madalena · SP</div>
          </div>
        </div>
      </div>

    </aside>
  )
}