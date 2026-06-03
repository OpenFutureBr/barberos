"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import AdminLayout from "@/components/admin/AdminLayout"

type EmpresaDetalhe = {
  empresa: {
    id: string
    name: string
    legalName: string | null
    cnpj: string | null
    email: string | null
    phone: string | null
    ownerName: string | null
    ownerEmail: string | null
    ownerPhone: string | null
    isActive: boolean
    isBlocked: boolean
    billingStatus: string
    trialEndsAt: string | null
    lastAccessAt: string | null
    createdAt: string
    updatedAt: string
    plan: {
      id: string
      name: string
      description: string | null
      priceMonthly: number
      maxEstablishments: number | null
      maxUsers: number | null
      maxClients: number | null
      maxAppointments: number | null
      maxStorageMb: number | null
      features: any
      isActive: boolean
    } | null
    subscription: {
      id: string
      status: string
      price: number
      billingDay: number
      startedAt: string
      nextBillingAt: string | null
      lastPaidAt: string | null
      cancelledAt: string | null
      provider: string | null
      externalId: string | null
      createdAt: string
    } | null
    storageUsage: {
      totalFiles: number
      totalSizeMb: number
      updatedAt: string
    } | null
  }
  resumo: {
    unidades: number
    unidadesAtivas: number
    usuarios: number
    usuariosAtivos: number
    clientes: number
    clientesAtivos: number
    agendamentos: number
    agendamentosMes: number
    pagamentosPendentes: number
    valorPendente: number
    produtos: number
    servicos: number
    caixas: number
    totalFiles: number
    totalStorageMb: number
    invoices: {
      pagas: number
      abertas: number
      atrasadas: number
      valorPago: number
      valorAberto: number
      valorAtrasado: number
    }
  }
  unidades: {
    id: string
    name: string
    slug: string
    cnpj: string | null
    razaoSocial: string | null
    phone: string | null
    email: string | null
    city: string | null
    state: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }[]
  usuarios: {
    id: string
    name: string
    email: string
    username: string | null
    role: string
    employmentType: string
    phone: string | null
    isActive: boolean
    establishmentId: string | null
    establishmentName: string | null
    createdAt: string
    updatedAt: string
  }[]
  faturas: {
    id: string
    status: string
    amount: number
    dueDate: string
    paidAt: string | null
    cancelledAt: string | null
    referenceMonth: string
    provider: string | null
    notes: string | null
    createdAt: string
  }[]
  metricas: {
    id: string
    establishmentId: string | null
    metric: string
    value: number
    referenceMonth: string
    createdAt: string
    updatedAt: string
  }[]
  pendencias: {
    id: string
    amount: number
    dueDate: string | null
    createdAt: string
    appointmentId: string
    scheduledAt: string
    client: {
      name: string
      phone: string
    }
    service: {
      name: string
    }
    establishment: {
      name: string
    }
  }[]
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

function fmtData(iso?: string | null) {
  if (!iso) return "—"

  return new Date(iso).toLocaleDateString("pt-BR")
}

function fmtDataHora(iso?: string | null) {
  if (!iso) return "—"

  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusClass(status: string, isBlocked?: boolean) {
  if (isBlocked) {
    return "bg-red-500/10 text-red-400 border-red-500/20"
  }

  if (status === "ACTIVE" || status === "PAID") {
    return "bg-green-500/10 text-green-400 border-green-500/20"
  }

  if (status === "PENDING" || status === "TRIAL") {
    return "bg-orange-500/10 text-orange-400 border-orange-500/20"
  }

  if (status === "OVERDUE") {
    return "bg-red-500/10 text-red-400 border-red-500/20"
  }

  if (status === "SUSPENDED" || status === "CANCELLED") {
    return "bg-red-500/10 text-red-400 border-red-500/20"
  }

  return "bg-zinc-800 text-zinc-400 border-zinc-700"
}

type Aba = "visao" | "unidades" | "usuarios" | "faturas" | "metricas"

export default function AdminEmpresaDetalhePage() {
  const { id } = useParams<{ id: string }>()

  const [dados, setDados] = useState<EmpresaDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<Aba>("visao")
  const [actionLoading, setActionLoading] = useState(false)
  const [novoPlano, setNovoPlano] = useState("")
  const [planos, setPlanos] = useState<{ id: string; name: string; priceMonthly: number }[]>([])

  useEffect(() => {
    fetch("/api/admin/planos")
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setPlanos(d.filter((p: any) => p.isActive)) : null)
      .catch(() => {})
  }, [])

  async function carregarDados() {
    if (!id) return

    setLoading(true)

    try {
      const res = await fetch(`/api/admin/empresas/${id}`)
      const d = await res.json()

      if (!d.error) {
        setDados(d)
        setNovoPlano(d.empresa?.plan?.id ?? "")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const empresa = dados?.empresa
  const resumo = dados?.resumo

  const usoUnidadesPct = useMemo(() => {
    const max = empresa?.plan?.maxEstablishments
    if (!max || !resumo) return null
    return Math.min(100, Math.round((resumo.unidades / max) * 100))
  }, [empresa?.plan?.maxEstablishments, resumo])

  const usoUsuariosPct = useMemo(() => {
    const max = empresa?.plan?.maxUsers
    if (!max || !resumo) return null
    return Math.min(100, Math.round((resumo.usuariosAtivos / max) * 100))
  }, [empresa?.plan?.maxUsers, resumo])

  const usoClientesPct = useMemo(() => {
    const max = empresa?.plan?.maxClients
    if (!max || !resumo) return null
    return Math.min(100, Math.round((resumo.clientes / max) * 100))
  }, [empresa?.plan?.maxClients, resumo])

  const usoStoragePct = useMemo(() => {
    const max = empresa?.plan?.maxStorageMb
    if (!max || !resumo) return null
    return Math.min(100, Math.round((resumo.totalStorageMb / max) * 100))
  }, [empresa?.plan?.maxStorageMb, resumo])

  async function executarAcao(body: any) {
  if (!id) return

  setActionLoading(true)

  try {
    const res = await fetch(`/api/admin/empresas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      alert(data?.error || "Erro ao executar ação.")
      return
    }

    await carregarDados()
    } catch (error) {
      console.error(error)
      alert("Erro ao executar ação.")
    } finally {
      setActionLoading(false)
    }
  }

  async function bloquearOuDesbloquear() {
    if (!empresa) return

    const texto = empresa.isBlocked
      ? "Deseja desbloquear esta empresa?"
      : "Deseja bloquear esta empresa?"

    if (!confirm(texto)) return

    await executarAcao({
      action: "toggle-block",
    })
  }

  async function alterarPlano() {
    if (!novoPlano) {
      alert("Selecione um plano.")
      return
    }

    if (!confirm(`Deseja alterar o plano para ${novoPlano}?`)) return

    await executarAcao({
      action: "change-plan",
      planId: novoPlano,
    })
  }

  async function marcarFaturaComoPaga(invoiceId: string) {
    if (!confirm("Deseja marcar esta fatura como paga?")) return

    await executarAcao({
      action: "mark-invoice-paid",
      invoiceId,
    })
  }
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-1">Empresa / Organização</div>
            <h1 className="text-2xl font-bold">{loading ? "Carregando..." : empresa?.name ?? "Empresa"}</h1>
            <p className="text-zinc-500 text-sm mt-1">{empresa?.cnpj ?? "Sem CNPJ"} · {empresa?.email ?? "Sem e-mail"}</p>
          </div>

          <div className="flex items-center gap-2">
            {empresa && (
              <span className={`text-xs px-3 py-1 rounded-full border ${statusClass(empresa.billingStatus, empresa.isBlocked)}`}>
                {empresa.isBlocked ? "Bloqueada" : empresa.billingStatus}
              </span>
            )}
            {empresa && (
              <button type="button" onClick={bloquearOuDesbloquear} disabled={actionLoading}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 ${
                  empresa.isBlocked
                    ? "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20"
                    : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                }`}>
                {empresa.isBlocked ? "Desbloquear" : "Bloquear"}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            Carregando detalhes...
          </div>
        ) : !dados || !empresa || !resumo ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center text-red-400">
            Não foi possível carregar a empresa.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-xs uppercase mb-1">
                  Plano atual
                </div>
                <div className="text-xl font-bold text-white">
                  {empresa.plan?.name ?? "Sem plano"}
                </div>
                <div className="text-zinc-600 text-xs mt-1">
                  {fmtMoeda(empresa.subscription?.price ?? empresa.plan?.priceMonthly ?? 0)}
                  /mês
                </div>
              </div>

              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <div className="text-green-400 text-xs uppercase mb-1">Unidades</div>
                <div className="text-2xl font-bold text-green-400">
                  {resumo.unidadesAtivas}/{resumo.unidades}
                </div>
                <div className="text-zinc-600 text-xs mt-1">
                  limite: {empresa.plan?.maxEstablishments ?? "∞"}
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <div className="text-blue-400 text-xs uppercase mb-1">Usuários</div>
                <div className="text-2xl font-bold text-blue-400">
                  {resumo.usuariosAtivos}/{resumo.usuarios}
                </div>
                <div className="text-zinc-600 text-xs mt-1">
                  limite: {empresa.plan?.maxUsers ?? "∞"}
                </div>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                <div className="text-orange-400 text-xs uppercase mb-1">
                  A receber
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {fmtMoeda(resumo.valorPendente)}
                </div>
                <div className="text-zinc-600 text-xs mt-1">
                  {resumo.pagamentosPendentes} pagamento
                  {resumo.pagamentosPendentes !== 1 ? "s" : ""} pendente
                  {resumo.pagamentosPendentes !== 1 ? "s" : ""}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-xs uppercase mb-1">Clientes</div>
                <div className="text-xl font-bold">{fmtNumero(resumo.clientes)}</div>
                <div className="text-zinc-600 text-xs mt-1">
                  {fmtNumero(resumo.clientesAtivos)} ativos · limite{" "}
                  {empresa.plan?.maxClients ?? "∞"}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-xs uppercase mb-1">
                  Agendamentos
                </div>
                <div className="text-xl font-bold">
                  {fmtNumero(resumo.agendamentos)}
                </div>
                <div className="text-zinc-600 text-xs mt-1">
                  {fmtNumero(resumo.agendamentosMes)} neste mês
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-xs uppercase mb-1">Storage</div>
                <div className="text-xl font-bold">
                  {fmtNumero(resumo.totalStorageMb)} MB
                </div>
                <div className="text-zinc-600 text-xs mt-1">
                  {fmtNumero(resumo.totalFiles)} arquivo
                  {resumo.totalFiles !== 1 ? "s" : ""} · limite{" "}
                  {empresa.plan?.maxStorageMb ?? "∞"} MB
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-zinc-500 text-xs uppercase mb-1">
                  Faturas abertas
                </div>
                <div className="text-xl font-bold text-amber-400">
                  {fmtMoeda(resumo.invoices.valorAberto)}
                </div>
                <div className="text-zinc-600 text-xs mt-1">
                  {resumo.invoices.abertas} aberta
                  {resumo.invoices.abertas !== 1 ? "s" : ""} ·{" "}
                  {resumo.invoices.atrasadas} atrasada
                  {resumo.invoices.atrasadas !== 1 ? "s" : ""}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-4 gap-4">
              {[
                {
                  label: "Unidades",
                  value:
                    usoUnidadesPct === null
                      ? "Sem limite"
                      : `${usoUnidadesPct}% usado`,
                  pct: usoUnidadesPct,
                },
                {
                  label: "Usuários",
                  value:
                    usoUsuariosPct === null
                      ? "Sem limite"
                      : `${usoUsuariosPct}% usado`,
                  pct: usoUsuariosPct,
                },
                {
                  label: "Clientes",
                  value:
                    usoClientesPct === null
                      ? "Sem limite"
                      : `${usoClientesPct}% usado`,
                  pct: usoClientesPct,
                },
                {
                  label: "Storage",
                  value:
                    usoStoragePct === null
                      ? "Sem limite"
                      : `${usoStoragePct}% usado`,
                  pct: usoStoragePct,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="text-zinc-500 text-xs uppercase mb-2">
                    {item.label}
                  </div>

                  <div className="text-zinc-300 text-sm mb-2">{item.value}</div>

                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.pct === null
                          ? "bg-zinc-600"
                          : item.pct >= 90
                            ? "bg-red-500"
                            : item.pct >= 70
                              ? "bg-orange-500"
                              : "bg-green-500"
                      }`}
                      style={{
                        width: `${item.pct ?? 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex gap-1">
              {[
                { id: "visao", label: "Visão geral" },
                { id: "unidades", label: "Unidades" },
                { id: "usuarios", label: "Usuários" },
                { id: "faturas", label: "Faturas" },
                { id: "metricas", label: "Métricas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAba(tab.id as Aba)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    aba === tab.id
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </section>

            {aba === "visao" && (
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h2 className="text-white font-bold mb-4">Dados da empresa</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Razão social</span>
                      <span className="text-zinc-300">
                        {empresa.legalName ?? "—"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">CNPJ</span>
                      <span className="text-zinc-300">{empresa.cnpj ?? "—"}</span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">E-mail</span>
                      <span className="text-zinc-300">{empresa.email ?? "—"}</span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Telefone</span>
                      <span className="text-zinc-300">{empresa.phone ?? "—"}</span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Criada em</span>
                      <span className="text-zinc-300">
                        {fmtData(empresa.createdAt)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500">Último acesso</span>
                      <span className="text-zinc-300">
                        {fmtDataHora(empresa.lastAccessAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h2 className="text-white font-bold mb-4">Plano e cobrança</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Plano</span>
                      <span className="text-zinc-300">
                        {empresa.plan?.name ?? "—"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Valor mensal</span>
                      <span className="text-amber-400 font-bold">
                        {fmtMoeda(
                          empresa.subscription?.price ??
                            empresa.plan?.priceMonthly ??
                            0,
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Status</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${statusClass(
                          empresa.subscription?.status ?? empresa.billingStatus,
                          empresa.isBlocked,
                        )}`}
                      >
                        {empresa.subscription?.status ?? empresa.billingStatus}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Próxima cobrança</span>
                      <span className="text-zinc-300">
                        {fmtData(empresa.subscription?.nextBillingAt)}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Último pagamento</span>
                      <span className="text-zinc-300">
                        {fmtData(empresa.subscription?.lastPaidAt)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500">Provedor</span>
                      <span className="text-zinc-300">
                        {empresa.subscription?.provider ?? "manual"}
                      </span>
                    </div>

                    <div className="pt-4 mt-4 border-t border-zinc-800 space-y-2">
                      <label className="text-zinc-500 text-xs block">
                        Alterar plano
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={novoPlano}
                          onChange={(e) => setNovoPlano(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                        >
                          <option value="">Selecione</option>
                          {planos.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — R$ {p.priceMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}/mês
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={alterarPlano}
                          disabled={actionLoading || !novoPlano}
                          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          Alterar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {aba === "unidades" && (
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                    Unidades físicas
                  </span>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                        Nome
                      </th>
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                        Local
                      </th>
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                        Contato
                      </th>
                      <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {dados.unidades.map((unidade) => (
                      <tr
                        key={unidade.id}
                        className="border-b border-zinc-800 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="text-white text-sm font-medium">
                            {unidade.name}
                          </div>
                          <div className="text-zinc-600 text-xs">
                            {unidade.slug}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-zinc-400 text-sm">
                          {[unidade.city, unidade.state].filter(Boolean).join(" / ") ||
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-zinc-400 text-sm">
                          {unidade.phone ?? unidade.email ?? "—"}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              unidade.isActive
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            {unidade.isActive ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {aba === "usuarios" && (
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                    Usuários
                  </span>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                        Nome
                      </th>
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                        Perfil
                      </th>
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                        Unidade
                      </th>
                      <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {dados.usuarios.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-zinc-800 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="text-white text-sm font-medium">
                            {user.name}
                          </div>
                          <div className="text-zinc-600 text-xs">
                            {user.email} · {user.username ?? "sem usuário"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-zinc-400 text-sm">
                          {user.role} · {user.employmentType}
                        </td>

                        <td className="px-4 py-3 text-zinc-400 text-sm">
                          {user.establishmentName ?? "Todas / sem unidade"}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              user.isActive
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            {user.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {aba === "faturas" && (
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                    Últimas faturas
                  </span>
                </div>

                {dados.faturas.length === 0 ? (
                  <div className="p-8 text-center text-zinc-600 text-sm">
                    Nenhuma fatura registrada.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                          Referência
                        </th>
                        <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                          Vencimento
                        </th>
                        <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                          Status
                        </th>
                        <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                          Valor
                        </th>
                        <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                          Ação
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {dados.faturas.map((fatura) => (
                        <tr
                          key={fatura.id}
                          className="border-b border-zinc-800 last:border-0"
                        >
                          <td className="px-4 py-3 text-white text-sm">
                            {fatura.referenceMonth}
                          </td>

                          <td className="px-4 py-3 text-zinc-400 text-sm">
                            {fmtData(fatura.dueDate)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${statusClass(
                                fatura.status,
                              )}`}
                            >
                              {fatura.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">
                            {fmtMoeda(fatura.amount)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {fatura.status !== "PAID" ? (
                              <button
                                type="button"
                                onClick={() => marcarFaturaComoPaga(fatura.id)}
                                disabled={actionLoading}
                                className="bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/20 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                Marcar paga
                              </button>
                            ) : (
                              <span className="text-zinc-600 text-xs">Quitada</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {aba === "metricas" && (
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                    Métricas de consumo
                  </span>
                </div>

                {dados.metricas.length === 0 ? (
                  <div className="p-8 text-center text-zinc-600 text-sm">
                    Nenhuma métrica registrada ainda.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                          Mês
                        </th>
                        <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                          Métrica
                        </th>
                        <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                          Valor
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {dados.metricas.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-zinc-800 last:border-0"
                        >
                          <td className="px-4 py-3 text-white text-sm">
                            {m.referenceMonth}
                          </td>

                          <td className="px-4 py-3 text-zinc-400 text-sm">
                            {m.metric}
                          </td>

                          <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                            {fmtNumero(m.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}

