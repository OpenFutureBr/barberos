"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

const NAV = [
  { href: "/admin",            label: "Dashboard", icon: "◈" },
  { href: "/admin/empresas",   label: "Empresas",  icon: "🏢" },
  { href: "/admin/planos",     label: "Planos",    icon: "📋" },
  { href: "/admin/faturamento",label: "Faturamento", icon: "💰" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black text-sm">✂</div>
            <span className="text-white font-bold text-sm">BarberOS</span>
            <span className="text-zinc-600 text-xs">/ Admin</span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV.map(item => {
              const ativo = item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    ativo ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}>
                  <span className="text-xs">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white text-xs font-medium">{session?.user?.name ?? "Admin"}</div>
            <div className="text-zinc-600 text-[10px]">@{session?.user?.username}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs border border-zinc-700 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
