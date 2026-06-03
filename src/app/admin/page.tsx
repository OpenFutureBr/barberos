"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"

type AdminDashboardData = {
  totalEmpresas: number
  empresasAtivas: number
  empresasBloqueadas: number
  mrr: number
  arr: number
  faturasPendentes: number
  valorPendente: number
  totalUsuarios: number
  agendamentosMes: number
  totalFiles: number
  totalStorageMb: number
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function fmtNumero(v: number) {
  return v.toLocaleString("pt-BR")
}

export default function AdminHomePage() {
  const [dados, setDados] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession()

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setDados(d)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin SaaS</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Gestão da plataforma, empresas, planos, cobrança e consumo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-white text-sm font-medium">{session?.user?.name ?? "Admin"}</div>
              <div className="text-zinc-500 text-xs">@{session?.user?.username}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
              Empresas
            </div>
            {loading ? (
              <div className="h-8 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">
                {fmtNumero(dados?.totalEmpresas ?? 0)}
              </div>
            )}
          </div>

          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="text-green-400 text-xs uppercase tracking-wide mb-1">
              Ativas
            </div>
            {loading ? (
              <div className="h-8 bg-green-500/10 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-green-400">
                {fmtNumero(dados?.empresasAtivas ?? 0)}
              </div>
            )}
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="text-red-400 text-xs uppercase tracking-wide mb-1">
              Bloqueadas
            </div>
            {loading ? (
              <div className="h-8 bg-red-500/10 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-red-400">
                {fmtNumero(dados?.empresasBloqueadas ?? 0)}
              </div>
            )}
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="text-amber-400 text-xs uppercase tracking-wide mb-1">
              MRR
            </div>
            {loading ? (
              <div className="h-8 bg-amber-500/10 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-amber-400">
                {fmtMoeda(dados?.mrr ?? 0)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
              ARR
            </div>
            <div className="text-xl font-bold">
              {fmtMoeda(dados?.arr ?? 0)}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
              Usuários ativos
            </div>
            <div className="text-xl font-bold">
              {fmtNumero(dados?.totalUsuarios ?? 0)}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
              Agendamentos no mês
            </div>
            <div className="text-xl font-bold">
              {fmtNumero(dados?.agendamentosMes ?? 0)}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
              Storage
            </div>
            <div className="text-xl font-bold">
              {fmtNumero(dados?.totalStorageMb ?? 0)} MB
            </div>
            <div className="text-zinc-600 text-xs mt-1">
              {fmtNumero(dados?.totalFiles ?? 0)} arquivo
              {(dados?.totalFiles ?? 0) !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Link
            href="/admin/empresas"
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-5 transition-colors"
          >
            <div className="text-white font-bold">Empresas</div>
            <div className="text-zinc-500 text-sm mt-1">
              Gerenciar CNPJs, redes e unidades.
            </div>
          </Link>

          <Link
            href="/admin/planos"
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-5 transition-colors"
          >
            <div className="text-white font-bold">Planos</div>
            <div className="text-zinc-500 text-sm mt-1">
              Definir limites, preços e recursos.
            </div>
          </Link>

          <Link
            href="/admin/faturamento"
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-5 transition-colors"
          >
            <div className="text-white font-bold">Faturamento</div>
            <div className="text-zinc-500 text-sm mt-1">
              Assinaturas, faturas e inadimplência.
            </div>
          </Link>

          <Link
            href="/admin/empresas"
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-5 transition-colors"
          >
            <div className="text-white font-bold">Consumo</div>
            <div className="text-zinc-500 text-sm mt-1">
              Uso de banco, storage e volume operacional.
            </div>
          </Link>
        </div>

        {(dados?.faturasPendentes ?? 0) > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
            <div className="text-orange-400 font-bold">
              Atenção: {dados?.faturasPendentes} fatura
              {(dados?.faturasPendentes ?? 0) !== 1 ? "s" : ""} pendente
              {(dados?.faturasPendentes ?? 0) !== 1 ? "s" : ""}
            </div>
            <div className="text-orange-300/70 text-sm mt-1">
              Valor em aberto: {fmtMoeda(dados?.valorPendente ?? 0)}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}