"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtData(iso?: string | null) {
  if (!iso) return "Sem vencimento"

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

function tipoLabel(
  tipo: string,
  commissionPct: number | null,
  benchFeePct: number | null,
  benchFee: number | null,
) {
  const pct = commissionPct ?? (benchFeePct ? 100 - benchFeePct : null)
  const sufixo = pct ? ` · ${pct}%` : benchFee ? ` · R$${benchFee}/mês` : ""

  return tipo + sufixo
}

const MESES_NOME = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

function gerarOpcoesPeriodo() {
  const opcoes: { label: string; mes: number; ano: number }[] = []
  const hoje = new Date()

  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)

    opcoes.push({
      label: `${MESES_NOME[d.getMonth()]} ${d.getFullYear()}`,
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
    })
  }

  return opcoes.reverse()
}

// SVG icons neutros
function IconDRE() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
      <rect x="0" y="0" width="13" height="2" rx="1" />
      <rect x="0" y="5.5" width="13" height="2" rx="1" />
      <rect x="0" y="11" width="13" height="2" rx="1" />
    </svg>
  )
}

function IconRepasses() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 4.5h9M7 1.5l3 3-3 3" />
      <path d="M12 8.5H3M6 5.5l-3 3 3 3" />
    </svg>
  )
}

function IconEvolucao() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1,11 4.5,6.5 7.5,8.5 12,2" />
      <circle cx="12" cy="2" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconPendentes() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M6.5 3.5v3.2l2 1.2" />
    </svg>
  )
}

type DRE = {
  receitaServicos: number
  receitaProdutos: number
  totalReceitas: number
  presencial?: {
    atendimentos: number
    receita: number
  }
  domicilio?: {
    atendimentos: number
    receita: number
  }
}

type Repasse = {
  profissionalId: string
  nome: string
  tipo: string
  commissionPct: number | null
  benchFee: number | null
  benchFeePct: number | null
  atendimentos: number
  bruto: number
  repasse: number
}

type Evolucao = {
  mes: number
  label: string
  valor: number
}

type Pendencia = {
  id: string
  appointmentId: string
  method: string
  status: "PENDING" | "OVERDUE"
  paymentStatus: string
  amount: number
  dueDate: string | null
  createdAt: string
  scheduledAt: string
  client: {
    id: string
    name: string
    phone: string
  }
  service: {
    name: string
    price: number
  }
  professional: {
    name: string
  }
}

type ResumoPendencias = {
  quantidade: number
  totalPendente: number
  totalVencido: number
  totalAVencer: number
}

type AbaFinanceiro = "dre" | "pendentes" | "repasses" | "evolucao"

export default function FinanceiroPage() {
  const opcoes = useMemo(() => gerarOpcoesPeriodo(), [])

  const [periodoIdx, setPeriodoIdx] = useState(0)
  const [aba, setAba] = useState<AbaFinanceiro>("dre")
  const [loading, setLoading] = useState(true)

  const [dre, setDre] = useState<DRE | null>(null)
  const [repasses, setRepasses] = useState<Repasse[]>([])
  const [evolucao, setEvolucao] = useState<Evolucao[]>([])
  const [pendentes, setPendentes] = useState<Pendencia[]>([])
  const [resumoPendencias, setResumoPendencias] = useState<ResumoPendencias>({
    quantidade: 0,
    totalPendente: 0,
    totalVencido: 0,
    totalAVencer: 0,
  })

  const [sortRepasses, setSortRepasses] = useState<"desc" | "asc">("desc")
  const [sortEvolucao, setSortEvolucao] = useState<"mes" | "desc" | "asc">("mes")

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pendencia | null>(
    null,
  )
  const [metodoRecebimento, setMetodoRecebimento] = useState<"PIX" | "CASH" | "CARD">(
    "PIX",
  )
  const [quitando, setQuitando] = useState(false)

  const periodo = opcoes[periodoIdx]

  const fetchDados = useCallback(() => {
    if (!periodo) return

    setLoading(true)

    fetch(`/api/financeiro?mes=${periodo.mes}&ano=${periodo.ano}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.dre) setDre(d.dre)
        if (Array.isArray(d.repasses)) setRepasses(d.repasses)
        if (Array.isArray(d.evolucao)) setEvolucao(d.evolucao)
        if (Array.isArray(d.pendentes)) setPendentes(d.pendentes)

        if (d.resumoPendencias) {
          setResumoPendencias(d.resumoPendencias)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [periodo?.mes, periodo?.ano])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  async function marcarComoPago() {
    if (!pagamentoSelecionado) return

    setQuitando(true)

    try {
      const res = await fetch("/api/financeiro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "marcar-pago",
          paymentId: pagamentoSelecionado.id,
          method: metodoRecebimento,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => null)
        alert(d?.error || "Erro ao marcar como pago.")
        return
      }

      setPagamentoSelecionado(null)
      setMetodoRecebimento("PIX")

      window.dispatchEvent(new CustomEvent("pagamentoConfirmado"))

      fetchDados()
    } catch (error) {
      console.error(error)
      alert("Erro ao marcar como pago.")
    } finally {
      setQuitando(false)
    }
  }

  const repassesOrdenados = [...repasses].sort((a, b) =>
    sortRepasses === "desc" ? b.repasse - a.repasse : a.repasse - b.repasse,
  )

  const evolucaoOrdenada = [...evolucao].sort((a, b) => {
    if (sortEvolucao === "mes") return a.mes - b.mes
    if (sortEvolucao === "desc") return b.valor - a.valor

    return a.valor - b.valor
  })

  const pendentesOrdenados = [...pendentes].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "OVERDUE" ? -1 : 1
    }

    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0

    return da - db
  })

  const maxEvolucao = Math.max(...evolucao.map((e) => e.valor), 1)
  const totalRepasses = repasses.reduce((s, r) => s + r.repasse, 0)

  const melhorMes = evolucao.reduce(
    (best, e) => (e.valor > best.valor ? e : best),
    evolucao[0] ?? { label: "—", valor: 0, mes: 0 },
  )

  const mesesComDados = evolucao.filter((e) => e.valor > 0)
  const mediaEvolucao = mesesComDados.length
    ? mesesComDados.reduce((s, e) => s + e.valor, 0) / mesesComDados.length
    : 0

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Financeiro</h1>
          <p className="text-zinc-500 text-sm">
            DRE · Pendentes · Repasses · Evolução mensal
          </p>
        </div>

        <select
          value={periodoIdx}
          onChange={(e) => setPeriodoIdx(Number(e.target.value))}
          className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
        >
          {opcoes.map((o, i) => (
            <option key={i} value={i}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">
            Receita total
          </div>

          {loading ? (
            <div className="h-8 bg-green-500/10 rounded animate-pulse" />
          ) : (
            <div className="text-green-400 text-2xl font-bold">
              {fmtMoeda(dre?.totalReceitas ?? 0)}
            </div>
          )}
        </div>

        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
          <div className="text-orange-400 text-xs font-mono uppercase tracking-widest mb-1">
            A receber
          </div>

          {loading ? (
            <div className="h-8 bg-orange-500/10 rounded animate-pulse" />
          ) : (
            <div className="text-orange-400 text-2xl font-bold">
              {fmtMoeda(resumoPendencias.totalPendente)}
            </div>
          )}
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="text-red-400 text-xs font-mono uppercase tracking-widest mb-1">
            Vencido
          </div>

          {loading ? (
            <div className="h-8 bg-red-500/10 rounded animate-pulse" />
          ) : (
            <div className="text-red-400 text-2xl font-bold">
              {fmtMoeda(resumoPendencias.totalVencido)}
            </div>
          )}
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-1">
            Repasses
          </div>

          {loading ? (
            <div className="h-8 bg-blue-500/10 rounded animate-pulse" />
          ) : (
            <div className="text-blue-400 text-2xl font-bold">
              {fmtMoeda(totalRepasses)}
            </div>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {(
          [
            { id: "dre", icon: <IconDRE />, label: "DRE" },
            { id: "pendentes", icon: <IconPendentes />, label: "Pendentes" },
            { id: "repasses", icon: <IconRepasses />, label: "Repasses" },
            { id: "evolucao", icon: <IconEvolucao />, label: "Evolução" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.icon}
            {tab.label}

            {tab.id === "pendentes" && resumoPendencias.quantidade > 0 && (
              <span className="ml-1 bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-full px-1.5 py-0.5 text-[10px]">
                {resumoPendencias.quantidade}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* DRE */}
      {aba === "dre" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
              DRE — {periodo?.label}
            </span>
          </div>

          <div className="divide-y divide-zinc-800">
            <div className="px-4 py-2 bg-green-500/5">
              <span className="text-green-400 text-xs font-mono uppercase tracking-widest">
                Receitas
              </span>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-zinc-600 text-sm">
                Carregando...
              </div>
            ) : dre && dre.totalReceitas > 0 ? (
              <>
                {dre.receitaServicos > 0 && (
                  <div className="flex justify-between px-4 py-3 hover:bg-zinc-800/40">
                    <span className="text-zinc-300 text-sm">Serviços prestados</span>
                    <span className="text-green-400 font-mono font-bold">
                      + {fmtMoeda(dre.receitaServicos)}
                    </span>
                  </div>
                )}

                {dre.receitaProdutos > 0 && (
                  <div className="flex justify-between px-4 py-3 hover:bg-zinc-800/40">
                    <span className="text-zinc-300 text-sm">
                      Produtos vendidos (PDV)
                    </span>
                    <span className="text-green-400 font-mono font-bold">
                      + {fmtMoeda(dre.receitaProdutos)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between px-4 py-3 bg-green-500/5">
                  <span className="text-green-400 text-sm font-bold">
                    Total Receitas
                  </span>
                  <span className="text-green-400 font-mono font-bold">
                    {fmtMoeda(dre.totalReceitas)}
                  </span>
                </div>

                {(dre.presencial || dre.domicilio) && (
                  <div className="px-4 py-2 bg-zinc-900 grid grid-cols-2 gap-2 border-t border-zinc-800">
                    <div className="bg-zinc-800 rounded-lg px-3 py-2">
                      <div className="text-zinc-500 text-xs mb-1">Presencial</div>
                      <div className="text-white text-sm font-bold">
                        {fmtMoeda(dre.presencial?.receita ?? 0)}
                      </div>
                      <div className="text-zinc-600 text-xs">
                        {dre.presencial?.atendimentos ?? 0} atend.
                      </div>
                    </div>

                    <div className="bg-zinc-800 rounded-lg px-3 py-2">
                      <div className="text-zinc-500 text-xs mb-1">Domicílio</div>
                      <div className="text-teal-400 text-sm font-bold">
                        {fmtMoeda(dre.domicilio?.receita ?? 0)}
                      </div>
                      <div className="text-zinc-600 text-xs">
                        {dre.domicilio?.atendimentos ?? 0} atend.
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-6 text-center text-zinc-600 text-sm">
                Nenhuma receita no período
              </div>
            )}

            <div className="px-4 py-2 bg-red-500/5">
              <span className="text-red-400 text-xs font-mono uppercase tracking-widest">
                Despesas
              </span>
            </div>

            <div className="px-4 py-6 text-center">
              <div className="text-zinc-600 text-sm">
                Nenhum lançamento de despesa
              </div>
              <div className="text-zinc-700 text-xs mt-1">
                O módulo de despesas será habilitado em breve
              </div>
            </div>

            <div className="flex justify-between px-4 py-4 bg-amber-500/5 border-t-2 border-amber-500/30">
              <span className="text-amber-400 text-base font-bold">
                Lucro Líquido
              </span>
              <span className="text-amber-400 font-mono font-bold text-xl">
                {fmtMoeda(dre?.totalReceitas ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pendentes */}
      {aba === "pendentes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
              <div className="text-orange-400 text-xs font-mono uppercase tracking-widest mb-1">
                Total pendente
              </div>
              <div className="text-orange-400 text-2xl font-bold">
                {fmtMoeda(resumoPendencias.totalPendente)}
              </div>
              <div className="text-zinc-600 text-xs mt-1">
                {resumoPendencias.quantidade} cobrança
                {resumoPendencias.quantidade !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <div className="text-red-400 text-xs font-mono uppercase tracking-widest mb-1">
                Vencido
              </div>
              <div className="text-red-400 text-2xl font-bold">
                {fmtMoeda(resumoPendencias.totalVencido)}
              </div>
            </div>

            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">
                A vencer
              </div>
              <div className="text-green-400 text-2xl font-bold">
                {fmtMoeda(resumoPendencias.totalAVencer)}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                Contas a receber
              </span>
              <span className="text-zinc-600 text-xs">
                {pendentesOrdenados.length} registro
                {pendentesOrdenados.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-zinc-600 text-sm">
                Carregando...
              </div>
            ) : pendentesOrdenados.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-zinc-600 text-sm">
                  Nenhum pagamento pendente
                </div>
                <div className="text-zinc-700 text-xs mt-1">
                  As cobranças de “Pagar depois” aparecerão aqui
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                      Cliente
                    </th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                      Serviço
                    </th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                      Vencimento
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
                  {pendentesOrdenados.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${
                        i === pendentesOrdenados.length - 1 ? "border-0" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-medium">
                          {p.client.name}
                        </div>
                        <div className="text-zinc-600 text-xs">{p.client.phone}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-zinc-300 text-sm">{p.service.name}</div>
                        <div className="text-zinc-600 text-xs">
                          {p.professional.name} · {fmtDataHora(p.scheduledAt)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            p.status === "OVERDUE"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          }`}
                        >
                          {p.status === "OVERDUE" ? "Vencido" : "Pendente"} ·{" "}
                          {fmtData(p.dueDate)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right text-orange-400 font-bold font-mono">
                        {fmtMoeda(p.amount)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setPagamentoSelecionado(p)
                            setMetodoRecebimento("PIX")
                          }}
                          className="bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/20 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        >
                          Marcar pago
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Repasses */}
      {aba === "repasses" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
              Repasses — {periodo?.label}
            </span>

            <button
              onClick={() => setSortRepasses((s) => (s === "desc" ? "asc" : "desc"))}
              className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
            >
              {sortRepasses === "desc" ? "↓" : "↑"} Repasse
            </button>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-zinc-600 text-sm">
              Carregando...
            </div>
          ) : repasses.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="text-zinc-600 text-sm">
                Nenhum repasse no período
              </div>
              <div className="text-zinc-700 text-xs mt-1">
                Os repasses aparecem conforme os atendimentos são concluídos
              </div>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                      Profissional
                    </th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                      Tipo
                    </th>
                    <th className="text-center px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                      Atendimentos
                    </th>
                    <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                      Bruto
                    </th>
                    <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">
                      Repasse
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {repassesOrdenados.map((r, i) => (
                    <tr
                      key={r.profissionalId}
                      className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${
                        i === repassesOrdenados.length - 1 ? "border-0" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-white text-sm font-medium">
                        {r.nome}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {tipoLabel(
                            r.tipo,
                            r.commissionPct,
                            r.benchFeePct,
                            r.benchFee,
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center text-zinc-400 text-sm">
                        {r.atendimentos}
                      </td>

                      <td className="px-4 py-3 text-right text-zinc-400 font-mono text-sm">
                        {fmtMoeda(r.bruto)}
                      </td>

                      <td className="px-4 py-3 text-right text-green-400 font-bold font-mono">
                        {fmtMoeda(r.repasse)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-4 py-3 border-t border-zinc-800 flex justify-between bg-zinc-800/40">
                <span className="text-zinc-400 text-sm font-bold">
                  Total repasses
                </span>
                <span className="text-green-400 font-bold font-mono">
                  {fmtMoeda(totalRepasses)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Evolução */}
      {aba === "evolucao" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
              Faturamento mensal — {periodo?.ano}
            </span>

            <div className="flex items-center gap-1">
              <span className="text-zinc-600 text-xs mr-1">Ordenar:</span>

              {(
                [
                  { key: "mes", label: "Mês" },
                  { key: "desc", label: "↓ Maior" },
                  { key: "asc", label: "↑ Menor" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortEvolucao(opt.key)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    sortEvolucao === opt.key
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-48 bg-zinc-800 rounded animate-pulse" />
          ) : (
            <>
              <div className="flex items-end gap-1.5 h-48">
                {evolucaoOrdenada.map((e) => {
                  const altura =
                    e.valor > 0 ? Math.max(4, Math.round((e.valor / maxEvolucao) * 100)) : 0

                  return (
                    <div key={e.mes} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-zinc-600 text-xs font-mono">
                        {e.valor > 0 ? `${(e.valor / 1000).toFixed(1)}k` : ""}
                      </div>

                      <div className="w-full flex items-end" style={{ height: "160px" }}>
                        <div
                          className={`w-full rounded-t transition-all ${
                            e.valor > 0
                              ? "bg-amber-500/70 hover:bg-amber-500"
                              : "bg-zinc-800"
                          }`}
                          style={{
                            height: e.valor > 0 ? `${altura}%` : "3px",
                          }}
                          title={e.valor > 0 ? fmtMoeda(e.valor) : "Sem dados"}
                        />
                      </div>

                      <div className="text-zinc-600 text-xs">{e.label}</div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <div className="text-zinc-500 text-xs mb-1">Melhor mês</div>
                  <div className="text-amber-400 font-bold text-sm">
                    {melhorMes.valor > 0
                      ? `${melhorMes.label} · ${fmtMoeda(melhorMes.valor)}`
                      : "—"}
                  </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <div className="text-zinc-500 text-xs mb-1">Meses com dados</div>
                  <div className="text-white font-bold">
                    {mesesComDados.length} de 12
                  </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <div className="text-zinc-500 text-xs mb-1">Média mensal</div>
                  <div className="text-blue-400 font-bold text-sm">
                    {mediaEvolucao > 0 ? fmtMoeda(mediaEvolucao) : "—"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal marcar pago */}
      {pagamentoSelecionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Marcar como pago</h2>

              <button
                onClick={() => setPagamentoSelecionado(null)}
                className="text-zinc-500 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="text-white font-bold">
                  {pagamentoSelecionado.client.name}
                </div>

                <div className="text-zinc-400 text-sm mt-1">
                  {pagamentoSelecionado.service.name}
                </div>

                <div className="text-zinc-500 text-xs mt-1">
                  Vencimento: {fmtData(pagamentoSelecionado.dueDate)}
                </div>

                <div className="text-green-400 text-2xl font-bold mt-3">
                  {fmtMoeda(pagamentoSelecionado.amount)}
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-2 block">
                  Método recebido
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "PIX", label: "PIX" },
                      { key: "CASH", label: "Dinheiro" },
                      { key: "CARD", label: "Cartão" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMetodoRecebimento(m.key)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                        metodoRecebimento === m.key
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPagamentoSelecionado(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={marcarComoPago}
                  disabled={quitando}
                  className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {quitando ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}