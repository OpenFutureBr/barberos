"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type Empresa = {
  id: string
  name: string
  legalName: string | null
  cnpj: string | null
  email: string | null
  phone: string | null
  isActive: boolean
  isBlocked: boolean
  billingStatus: string
  createdAt: string
  lastAccessAt: string | null
  plan: {
    id: string
    name: string
    priceMonthly: number
    maxEstablishments: number | null
    maxUsers: number | null
    maxClients: number | null
    maxAppointments: number | null
    maxStorageMb: number | null
  } | null
  subscription: {
    id: string
    status: string
    price: number
    nextBillingAt: string | null
    lastPaidAt: string | null
    provider: string | null
  } | null
  usage: {
    establishments: number
    activeEstablishments: number
    users: number
    activeUsers: number
    clients: number
    appointments: number
    pendingPayments: number
    pendingAmount: number
    totalFiles: number
    totalStorageMb: number
  }
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function fmtData(iso?: string | null) {
  if (!iso) return "—"

  return new Date(iso).toLocaleDateString("pt-BR")
}

function statusClass(status: string, isBlocked: boolean) {
  if (isBlocked) {
    return "bg-red-500/10 text-red-400 border-red-500/20"
  }

  if (status === "ACTIVE") {
    return "bg-green-500/10 text-green-400 border-green-500/20"
  }

  if (status === "OVERDUE") {
    return "bg-orange-500/10 text-orange-400 border-orange-500/20"
  }

  if (status === "SUSPENDED" || status === "CANCELLED") {
    return "bg-red-500/10 text-red-400 border-red-500/20"
  }

  return "bg-zinc-800 text-zinc-400 border-zinc-700"
}

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState<"todas" | "ativas" | "bloqueadas" | "atrasadas">(
    "todas",
  )

  useEffect(() => {
    fetch("/api/admin/empresas")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setEmpresas(d)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return empresas.filter((e) => {
      const matchBusca =
        !termo ||
        e.name.toLowerCase().includes(termo) ||
        e.legalName?.toLowerCase().includes(termo) ||
        e.cnpj?.toLowerCase().includes(termo) ||
        e.email?.toLowerCase().includes(termo)

      const matchFiltro =
        filtro === "todas" ||
        (filtro === "ativas" && !e.isBlocked && e.billingStatus === "ACTIVE") ||
        (filtro === "bloqueadas" && e.isBlocked) ||
        (filtro === "atrasadas" && e.billingStatus === "OVERDUE")

      return matchBusca && matchFiltro
    })
  }, [empresas, busca, filtro])

  const resumo = useMemo(() => {
    const total = empresas.length
    const ativas = empresas.filter(
      (e) => !e.isBlocked && e.billingStatus === "ACTIVE",
    ).length
    const bloqueadas = empresas.filter((e) => e.isBlocked).length
    const atrasadas = empresas.filter((e) => e.billingStatus === "OVERDUE").length
    const mrr = empresas.reduce((s, e) => s + (e.subscription?.price ?? 0), 0)

    return { total, ativas, bloqueadas, atrasadas, mrr }
  }, [empresas])

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Empresas</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Organizações, redes e CNPJs cadastrados na plataforma.
            </p>
          </div>

          <Link
            href="/admin"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors"
          >
            ← Voltar
          </Link>
        </div>

        <section className="grid grid-cols-5 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase mb-1">Total</div>
            <div className="text-2xl font-bold">{resumo.total}</div>
          </div>

          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="text-green-400 text-xs uppercase mb-1">Ativas</div>
            <div className="text-2xl font-bold text-green-400">
              {resumo.ativas}
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="text-red-400 text-xs uppercase mb-1">Bloqueadas</div>
            <div className="text-2xl font-bold text-red-400">
              {resumo.bloqueadas}
            </div>
          </div>

          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
            <div className="text-orange-400 text-xs uppercase mb-1">Atrasadas</div>
            <div className="text-2xl font-bold text-orange-400">
              {resumo.atrasadas}
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="text-amber-400 text-xs uppercase mb-1">MRR</div>
            <div className="text-2xl font-bold text-amber-400">
              {fmtMoeda(resumo.mrr)}
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-zinc-300 text-sm font-semibold">
                Lista de empresas
              </div>
              <div className="text-zinc-600 text-xs mt-0.5">
                {empresasFiltradas.length} registro
                {empresasFiltradas.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar empresa, CNPJ ou e-mail"
                className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 w-72 placeholder:text-zinc-700"
              />

              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
              >
                <option value="todas">Todas</option>
                <option value="ativas">Ativas</option>
                <option value="bloqueadas">Bloqueadas</option>
                <option value="atrasadas">Atrasadas</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-600 text-sm">
              Carregando empresas...
            </div>
          ) : empresasFiltradas.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-zinc-600 text-sm">
                Nenhuma empresa encontrada
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                    Empresa
                  </th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                    Plano
                  </th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                    Status
                  </th>
                  <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                    Uso
                  </th>
                  <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                    A receber
                  </th>
                  <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {empresasFiltradas.map((e, i) => (
                  <tr
                    key={e.id}
                    className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${
                      i === empresasFiltradas.length - 1 ? "border-0" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-white text-sm font-medium">
                        {e.name}
                      </div>
                      <div className="text-zinc-600 text-xs">
                        {e.cnpj || "Sem CNPJ"} · {e.email || "Sem e-mail"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-zinc-300 text-sm">
                        {e.plan?.name ?? "Sem plano"}
                      </div>
                      <div className="text-zinc-600 text-xs">
                        {fmtMoeda(e.subscription?.price ?? e.plan?.priceMonthly ?? 0)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${statusClass(
                          e.billingStatus,
                          e.isBlocked,
                        )}`}
                      >
                        {e.isBlocked ? "Bloqueada" : e.billingStatus}
                      </span>
                      <div className="text-zinc-600 text-xs mt-1">
                        Próx. cobrança: {fmtData(e.subscription?.nextBillingAt)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="text-zinc-300 text-xs">
                        {e.usage.establishments}/{e.plan?.maxEstablishments ?? "∞"} unidades
                      </div>
                      <div className="text-zinc-600 text-xs">
                        {e.usage.activeUsers}/{e.plan?.maxUsers ?? "∞"} usuários ·{" "}
                        {e.usage.clients}/{e.plan?.maxClients ?? "∞"} clientes
                      </div>
                      <div className="text-zinc-700 text-xs">
                        {e.usage.totalStorageMb} MB storage
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div
                        className={`font-mono text-sm font-bold ${
                          e.usage.pendingAmount > 0
                            ? "text-orange-400"
                            : "text-zinc-600"
                        }`}
                      >
                        {fmtMoeda(e.usage.pendingAmount)}
                      </div>
                      <div className="text-zinc-600 text-xs">
                        {e.usage.pendingPayments} pendência
                        {e.usage.pendingPayments !== 1 ? "s" : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/empresas/${e.id}`}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs transition-colors"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  )
}