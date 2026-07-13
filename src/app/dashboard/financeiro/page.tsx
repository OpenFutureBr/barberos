"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import PagamentoModal from "@/components/layout/PagamentoModal"
import { fetchJsonSafe } from "@/lib/safe-fetch"
import { GRUPOS_DESPESA, GRUPOS_RECEITA, TIPO_BADGE, TIPO_LABEL } from "@/lib/categorias-caixa"

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

function IconCategorias() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z" />
    </svg>
  )
}

type DRE = {
  receitaServicos: number
  receitaProdutos: number
  receitaAssinaturas: number
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
  tipo?: "payment" | "subscription"
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

type AbaFinanceiro = "dre" | "repasses" | "evolucao" | "categorias"

type CategoriaCustom = { id: string; nome: string; tipo: "CUSTO" | "DESPESA" }

function calcularStatusPendencia(dueDate?: string | null): "PENDING" | "OVERDUE" {
  if (!dueDate) return "PENDING"

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const vencimento = new Date(dueDate)
  vencimento.setHours(0, 0, 0, 0)

  return vencimento < hoje ? "OVERDUE" : "PENDING"
}

function normalizarDre(resumo: any): DRE {
  return {
    receitaServicos: Number(resumo?.receitaServicos ?? resumo?.total ?? 0),
    receitaProdutos: Number(resumo?.receitaProdutos ?? 0),
    receitaAssinaturas: Number(resumo?.receitaAssinaturas ?? 0),
    totalReceitas: Number(
      resumo?.totalReceitas ??
        resumo?.total ??
        resumo?.receitaServicos ??
        0,
    ),
    presencial: resumo?.presencial ?? {
      atendimentos: 0,
      receita: 0,
    },
    domicilio: resumo?.domicilio ?? {
      atendimentos: 0,
      receita: 0,
    },
  }
}

function normalizarPendencias(data: any[]): Pendencia[] {
  return data.map((p) => {
    const appointment = p.appointment ?? {}

    return {
      id: p.id,
      tipo: p.tipo ?? "payment",
      appointmentId: p.appointmentId ?? appointment.id ?? "",
      method: p.method ?? "PAY_LATER",
      status: p.status ?? calcularStatusPendencia(p.dueDate),
      paymentStatus: p.paymentStatus ?? "PENDING",
      amount: Number(p.amount ?? 0),
      dueDate: p.dueDate ?? null,
      createdAt: p.createdAt ?? new Date().toISOString(),
      scheduledAt: p.scheduledAt ?? appointment.scheduledAt ?? new Date().toISOString(),
      client: {
        id: p.client?.id ?? appointment.client?.id ?? "",
        name: p.client?.name ?? appointment.client?.name ?? "Cliente",
        phone: p.client?.phone ?? appointment.client?.phone ?? "",
      },
      service: {
        name: p.service?.name ?? appointment.service?.name ?? "Serviço",
        price: Number(p.service?.price ?? appointment.service?.price ?? 0),
      },
      professional: {
        name: p.professional?.name ?? appointment.professional?.name ?? "Profissional",
      },
    }
  })
}

function calcularResumoPendencias(pendencias: Pendencia[]): ResumoPendencias {
  const totalPendente = pendencias.reduce((s, p) => s + p.amount, 0)
  const totalVencido = pendencias
    .filter((p) => p.status === "OVERDUE")
    .reduce((s, p) => s + p.amount, 0)

  const totalAVencer = pendencias
    .filter((p) => p.status !== "OVERDUE")
    .reduce((s, p) => s + p.amount, 0)

  return {
    quantidade: pendencias.length,
    totalPendente,
    totalVencido,
    totalAVencer,
  }
}

function normalizarRepasses(data: any): Repasse[] {
  if (Array.isArray(data)) return data

  /**
   * Fallback caso o endpoint /api/financeiro/repasses ainda esteja retornando
   * um mapa simples { profissionalId: valor }.
   *
   * O ideal é depois ajustarmos esse endpoint para retornar nome, tipo,
   * comissão, bruto e repasse completos.
   */
  if (data && typeof data === "object") {
    return Object.entries(data).map(([profissionalId, bruto]) => ({
      profissionalId,
      nome: profissionalId,
      tipo: "—",
      commissionPct: null,
      benchFee: null,
      benchFeePct: null,
      atendimentos: 0,
      bruto: Number(bruto ?? 0),
      repasse: Number(bruto ?? 0),
    }))
  }

  return []
}

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

  // Categorias custom de custo/despesa
  const [categoriasCustom, setCategoriasCustom] = useState<CategoriaCustom[]>([])
  const [catNome, setCatNome] = useState("")
  const [catTipo, setCatTipo] = useState<"CUSTO" | "DESPESA">("DESPESA")
  const [salvandoCat, setSalvandoCat] = useState(false)

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pendencia | null>(
    null,
  )
  const periodo = opcoes[periodoIdx]

  const fetchDados = useCallback(() => {
    if (!periodo) return

    setLoading(true)

    // fetchJsonSafe mantém o último dado bom em cache se a busca falhar —
    // nunca zera DRE/pendências/repasses/evolução por causa de uma falha
    // transitória (ex: pool de conexões esgotado no servidor).
    Promise.all([
      fetchJsonSafe(
        `/api/financeiro/resumo?mes=${periodo.mes}&ano=${periodo.ano}`,
        `financeiro:resumo:${periodo.ano}-${periodo.mes}`,
      ),
      fetchJsonSafe("/api/financeiro/pendentes", "financeiro:pendentes"),
      fetchJsonSafe(
        `/api/financeiro/repasses?mes=${periodo.mes}&ano=${periodo.ano}`,
        `financeiro:repasses:${periodo.ano}-${periodo.mes}`,
      ),
      fetchJsonSafe(`/api/financeiro/evolucao?ano=${periodo.ano}`, `financeiro:evolucao:${periodo.ano}`),
    ])
      .then(([resumo, pendentesData, repassesData, evolucaoData]) => {
        if (resumo) setDre(normalizarDre(resumo))

        if (pendentesData) {
          const pendenciasNormalizadas = normalizarPendencias(
            Array.isArray(pendentesData) ? pendentesData : [],
          )

          setPendentes(pendenciasNormalizadas)
          setResumoPendencias(calcularResumoPendencias(pendenciasNormalizadas))
        }

        if (repassesData) {
          setRepasses(normalizarRepasses(repassesData))
        }

        if (evolucaoData) {
          setEvolucao(Array.isArray(evolucaoData) ? evolucaoData : [])
        }
      })
      .finally(() => setLoading(false))
  }, [periodo?.mes, periodo?.ano])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  useEffect(() => {
    fetch("/api/caixa/categorias")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.categorias)) setCategoriasCustom(d.categorias) })
      .catch(() => {})
  }, [])

  async function adicionarCategoria() {
    if (!catNome.trim()) return
    const nova: CategoriaCustom = { id: Date.now().toString(), nome: catNome.trim(), tipo: catTipo }
    const novaLista = [...categoriasCustom, nova]
    setSalvandoCat(true)
    await fetch("/api/caixa/categorias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorias: novaLista }),
    }).catch(() => {})
    setCategoriasCustom(novaLista)
    setCatNome("")
    setSalvandoCat(false)
  }

  async function removerCategoria(id: string) {
    const novaLista = categoriasCustom.filter(c => c.id !== id)
    await fetch("/api/caixa/categorias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorias: novaLista }),
    }).catch(() => {})
    setCategoriasCustom(novaLista)
  }

  const repassesOrdenados = [...repasses].sort((a, b) =>
    sortRepasses === "desc" ? b.repasse - a.repasse : a.repasse - b.repasse,
  )

  const evolucaoOrdenada = [...evolucao].sort((a, b) => {
    if (sortEvolucao === "mes") return a.mes - b.mes
    if (sortEvolucao === "desc") return b.valor - a.valor

    return a.valor - b.valor
  })

  // Memoizado — antes ordenava `pendentes` de novo a cada render (a tela toda
  // re-renderiza a cada troca de período, aba, ou digitação em outro campo).
  const pendentesOrdenados = useMemo(() => [...pendentes].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "OVERDUE" ? -1 : 1
    }

    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0

    return da - db
  }), [pendentes])

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
            { id: "repasses", icon: <IconRepasses />, label: "Repasses" },
            { id: "evolucao", icon: <IconEvolucao />, label: "Evolução" },
            { id: "categorias", icon: <IconCategorias />, label: "Categorias" },
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
                      Produtos (estoque)
                    </span>
                    <span className="text-green-400 font-mono font-bold">
                      + {fmtMoeda(dre.receitaProdutos)}
                    </span>
                  </div>
                )}

                {dre.receitaAssinaturas > 0 && (
                  <div className="flex justify-between px-4 py-3 hover:bg-zinc-800/40">
                    <span className="text-zinc-300 text-sm">
                      Assinaturas
                    </span>
                    <span className="text-green-400 font-mono font-bold">
                      + {fmtMoeda(dre.receitaAssinaturas)}
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

      {/* Pendentes — movido para PIX & Cobranças */}
      {false && aba === ("pendentes" as string) && (
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
                        <div className="flex items-center gap-2">
                          <div className="text-white text-sm font-medium">{p.client.name}</div>
                          {p.tipo === "subscription" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20 leading-none">assinatura</span>
                          )}
                        </div>
                        <div className="text-zinc-600 text-xs">{p.client.phone}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-zinc-300 text-sm">{p.service.name}</div>
                        {p.tipo !== "subscription" && (
                          <div className="text-zinc-600 text-xs">
                            {p.professional.name} · {fmtDataHora(p.scheduledAt)}
                          </div>
                        )}
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
                          onClick={() => setPagamentoSelecionado(p)}
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
      {/* Categorias de custo/despesa */}
      {aba === "categorias" && (
        <div className="space-y-4">
          {/* Categorias pré-existentes (receita e despesa) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Receitas pré-definidas</span>
              </div>
              <div className="p-4 space-y-3">
                {GRUPOS_RECEITA.map(grupo => (
                  <div key={grupo.grupo}>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${grupo.cor}`}>{grupo.grupo}</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {grupo.categorias.map(cat => (
                        <span key={cat.label} className={`text-xs px-2 py-1 rounded-lg border ${TIPO_BADGE[cat.tipo]}`}>
                          {cat.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Despesas pré-definidas</span>
              </div>
              <div className="p-4 space-y-3">
                {GRUPOS_DESPESA.map(grupo => (
                  <div key={grupo.grupo}>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${grupo.cor}`}>{grupo.grupo}</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {grupo.categorias.map(cat => (
                        <span key={cat.label} className={`text-xs px-2 py-1 rounded-lg border ${TIPO_BADGE[cat.tipo]}`}>
                          {cat.label} <span className="opacity-60">· {TIPO_LABEL[cat.tipo]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-4">Nova categoria</div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-zinc-500 text-xs mb-1 block">Nome</label>
                <input
                  value={catNome}
                  onChange={e => setCatNome(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") adicionarCategoria() }}
                  placeholder="Ex: Material de escritório"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="w-36">
                <label className="text-zinc-500 text-xs mb-1 block">Tipo</label>
                <select
                  value={catTipo}
                  onChange={e => setCatTipo(e.target.value as "CUSTO" | "DESPESA")}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="CUSTO">Custo</option>
                  <option value="DESPESA">Despesa</option>
                </select>
              </div>
              <button
                onClick={adicionarCategoria}
                disabled={salvandoCat || !catNome.trim()}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                {salvandoCat ? "..." : "+ Adicionar"}
              </button>
            </div>
            <p className="text-zinc-600 text-xs mt-3">
              Categorias criadas aqui aparecerão no botão + ao lançar saída de dinheiro.
            </p>
          </div>

          {categoriasCustom.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                  Categorias cadastradas ({categoriasCustom.length})
                </span>
              </div>
              <div className="divide-y divide-zinc-800">
                {categoriasCustom.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        cat.tipo === "CUSTO"
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      }`}>
                        {cat.tipo === "CUSTO" ? "Custo" : "Despesa"}
                      </span>
                      <span className="text-zinc-200 text-sm">{cat.nome}</span>
                    </div>
                    <button
                      onClick={() => removerCategoria(cat.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {categoriasCustom.length === 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <div className="text-zinc-600 text-sm">Nenhuma categoria personalizada ainda.</div>
              <div className="text-zinc-700 text-xs mt-1">Adicione acima para que apareçam no lançamento de saída.</div>
            </div>
          )}
        </div>
      )}

      {/* Modal marcar pago */}
      <PagamentoModal
        ocultarPayLater
        dados={pagamentoSelecionado ? {
          appointmentId: pagamentoSelecionado.id,
          clientName: pagamentoSelecionado.client.name,
          serviceName: pagamentoSelecionado.service.name,
          professionalName: pagamentoSelecionado.professional.name || undefined,
          amount: pagamentoSelecionado.amount,
        } : null}
        endpointOverride="/api/financeiro"
        bodyExtra={{ action: "marcar-pago", paymentId: pagamentoSelecionado?.id }}
        onFechar={() => setPagamentoSelecionado(null)}
        onConfirmado={() => {
          setPagamentoSelecionado(null)
          fetchDados()
          window.dispatchEvent(new CustomEvent("pagamentoConfirmado"))
        }}
      />
    </DashboardLayout>
  )
}