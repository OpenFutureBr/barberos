"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import AdminLayout from "@/components/admin/AdminLayout"

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

type NovaEmpresaForm = {
  name: string
  legalName: string
  cnpj: string
  email: string
  phone: string
  planId: string
  unitName: string
  unitCity: string
  unitState: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  ownerUsername: string
  ownerPassword: string
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

function novaEmpresaVazia(): NovaEmpresaForm {
  return {
    name: "",
    legalName: "",
    cnpj: "",
    email: "",
    phone: "",
    planId: "START",
    unitName: "",
    unitCity: "",
    unitState: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerUsername: "",
    ownerPassword: "123456",
  }
}

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState<
    "todas" | "ativas" | "bloqueadas" | "atrasadas"
  >("todas")

  const [modalNovaEmpresa, setModalNovaEmpresa] = useState(false)
  const [criando, setCriando] = useState(false)
  const [erroCriacao, setErroCriacao] = useState("")
  const [novaEmpresa, setNovaEmpresa] = useState<NovaEmpresaForm>(novaEmpresaVazia())
  const [planosDisponiveis, setPlanosDisponiveis] = useState<{ id: string; name: string; priceMonthly: number }[]>([])

  useEffect(() => {
    fetch("/api/admin/planos")
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setPlanosDisponiveis(d.filter((p: any) => p.isActive)) : null)
      .catch(() => {})
  }, [])

  async function carregarEmpresas() {
    setLoading(true)

    try {
      const res = await fetch("/api/admin/empresas")
      const d = await res.json()

      if (Array.isArray(d)) {
        setEmpresas(d)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarEmpresas()
  }, [])

  async function criarEmpresa() {
    setErroCriacao("")

    if (!novaEmpresa.name.trim()) {
      setErroCriacao("Informe o nome da empresa.")
      return
    }

    if (!novaEmpresa.unitName.trim()) {
      setErroCriacao("Informe o nome da primeira unidade.")
      return
    }

    if (!novaEmpresa.ownerName.trim()) {
      setErroCriacao("Informe o nome do dono/gestor.")
      return
    }

    if (!novaEmpresa.ownerEmail.trim()) {
      setErroCriacao("Informe o e-mail do dono/gestor.")
      return
    }

    if (!novaEmpresa.ownerPassword || novaEmpresa.ownerPassword.length < 6) {
      setErroCriacao("A senha inicial deve ter pelo menos 6 caracteres.")
      return
    }

    setCriando(true)

    try {
      const res = await fetch("/api/admin/empresas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(novaEmpresa),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setErroCriacao(data?.error || "Erro ao criar empresa.")
        return
      }

      setModalNovaEmpresa(false)
      setNovaEmpresa(novaEmpresaVazia())

      await carregarEmpresas()
    } catch (error) {
      console.error(error)
      setErroCriacao("Erro ao criar empresa.")
    } finally {
      setCriando(false)
    }
  }

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

    return {
      total,
      ativas,
      bloqueadas,
      atrasadas,
      mrr,
    }
  }, [empresas])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Empresas</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Organizações, redes e CNPJs cadastrados na plataforma.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setErroCriacao(""); setNovaEmpresa(novaEmpresaVazia()); setModalNovaEmpresa(true) }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Nova empresa
          </button>
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
            <div className="text-orange-400 text-xs uppercase mb-1">
              Atrasadas
            </div>
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
                        {e.usage.establishments}/{e.plan?.maxEstablishments ?? "∞"}{" "}
                        unidades
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

      {modalNovaEmpresa && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div>
                <h2 className="text-white font-bold text-lg">Nova empresa</h2>
                <p className="text-zinc-500 text-sm">
                  Cadastre a organização, primeira unidade e usuário dono.
                </p>
              </div>

              <button
                onClick={() => setModalNovaEmpresa(false)}
                className="text-zinc-500 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">
                  Empresa contratante
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={novaEmpresa.name}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Nome fantasia *"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <input
                    value={novaEmpresa.legalName}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        legalName: e.target.value,
                      }))
                    }
                    placeholder="Razão social"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <input
                    value={novaEmpresa.cnpj}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        cnpj: e.target.value,
                      }))
                    }
                    placeholder="CNPJ"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <select
                    value={novaEmpresa.planId}
                    onChange={(e) => setNovaEmpresa((s) => ({ ...s, planId: e.target.value }))}
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  >
                    <option value="">— selecione —</option>
                    {planosDisponiveis.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R$ {p.priceMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}/mês
                      </option>
                    ))}
                  </select>

                  <input
                    value={novaEmpresa.email}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        email: e.target.value,
                      }))
                    }
                    placeholder="E-mail da empresa"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <input
                    value={novaEmpresa.phone}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Telefone da empresa"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">
                  Primeira unidade
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <input
                    value={novaEmpresa.unitName}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        unitName: e.target.value,
                      }))
                    }
                    placeholder="Nome da unidade *"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 col-span-3"
                  />

                  <input
                    value={novaEmpresa.unitCity}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        unitCity: e.target.value,
                      }))
                    }
                    placeholder="Cidade"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 col-span-2"
                  />

                  <input
                    value={novaEmpresa.unitState}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        unitState: e.target.value,
                      }))
                    }
                    placeholder="UF"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">
                  Usuário dono da barbearia
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={novaEmpresa.ownerName}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        ownerName: e.target.value,
                      }))
                    }
                    placeholder="Nome do dono/gestor *"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <input
                    value={novaEmpresa.ownerEmail}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        ownerEmail: e.target.value,
                      }))
                    }
                    placeholder="E-mail de login *"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <input
                    value={novaEmpresa.ownerPhone}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        ownerPhone: e.target.value,
                      }))
                    }
                    placeholder="Telefone"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <input
                    value={novaEmpresa.ownerUsername}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        ownerUsername: e.target.value,
                      }))
                    }
                    placeholder="Usuário de login, opcional"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <input
                    value={novaEmpresa.ownerPassword}
                    onChange={(e) =>
                      setNovaEmpresa((s) => ({
                        ...s,
                        ownerPassword: e.target.value,
                      }))
                    }
                    placeholder="Senha inicial *"
                    type="text"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 col-span-2"
                  />
                </div>
              </div>

              {erroCriacao && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
                  {erroCriacao}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovaEmpresa(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={criarEmpresa}
                  disabled={criando}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {criando ? "Criando..." : "Criar empresa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}