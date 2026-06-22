"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import Link from "next/link"

// Cache de módulo — persiste entre navegações na mesma sessão do browser
const _cache: {
  dashData: DashData | null
  appts: Appt[]
  caixaData: CaixaData | null
  evolucao: { mes: number; label: string; valor: number }[]
  periodKey: string
  ts: number
} = { dashData: null, appts: [], caixaData: null, evolucao: [], periodKey: "", ts: 0 }
const CACHE_TTL = 3 * 60 * 1000 // 3 minutos

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function fmtPct(v: number) {
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%"
}
function hojeStr() { return new Date().toISOString().split("T")[0] }

function navDia(iso: string, delta: number) {
  const d = new Date(iso + "T12:00:00")
  d.setDate(d.getDate() + delta)
  return d.toISOString().split("T")[0]
}

type Periodo = "hoje" | "ontem" | "semana" | "mes" | "custom"

function calcRange(p: Periodo): { from: string; to: string } {
  const n = new Date()
  const hoje = n.toISOString().split("T")[0]
  if (p === "hoje") return { from: hoje, to: hoje }
  if (p === "ontem") { const d = navDia(hoje, -1); return { from: d, to: d } }
  if (p === "semana") {
    const dow = n.getDay()
    const seg = navDia(hoje, -dow + (dow === 0 ? -6 : 1))
    return { from: seg, to: hoje }
  }
  if (p === "mes") {
    const from = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`
    return { from, to: hoje }
  }
  return { from: hoje, to: hoje }
}

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "hoje",   label: "Hoje" },
  { key: "ontem",  label: "Ontem" },
  { key: "semana", label: "Esta semana" },
  { key: "mes",    label: "Este mês" },
  { key: "custom", label: "Período" },
]

type Appt = {
  id: string; status: string; scheduledAt: string
  client: { name: string }; service: { name: string; price: number; durationMin: number }
  professional: { id: string; name: string }; payment: { amount: number } | null
}

type DashData = {
  faturamento: number
  faturamentoRecebido?: number
  receitaServicos?: number
  receitaProdutos?: number

  atendimentos: number
  ticketMedio: number

  clientesVip: number
  pendentes: number
  cancelados: number

  pagamentosPendentes?: number
  valorPendente?: number

  mesAtualClientes: number
  mesAnteriorClientes: number

  split?: {
    presencial: {
      atendimentos: number
      receita: number
    }
    domicilio: {
      atendimentos: number
      receita: number
    }
  }

  topServicos: {
    nome: string
    count: number
    receita: number
  }[]

  topProdutos: {
    nome: string
    qtd: number
    receita: number
  }[]
}

type CaixaData = { caixa: { id: string; closedAt: string | null } | null; lancamentos: any[] }

export default function DashboardPage() {
  const [dados, setDados] = useState<DashData | null>(null)
  const [appts, setAppts] = useState<Appt[]>([])
  const [caixa, setCaixa] = useState<CaixaData | null>(null)
  const [evolucao, setEvolucao] = useState<{ mes: number; label: string; valor: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>("hoje")
  const [customFrom, setCustomFrom] = useState(hojeStr())
  const [customTo, setCustomTo] = useState(hojeStr())

  const range = periodo === "custom" ? { from: customFrom, to: customTo } : calcRange(periodo)

  const fetchDados = useCallback(async (forceRefresh = false) => {
    const { from, to } = periodo === "custom" ? { from: customFrom, to: customTo } : calcRange(periodo)
    const key = `${from}|${to}`

    // Usa cache se ainda válido e não forçando recarga
    if (!forceRefresh && _cache.periodKey === key && Date.now() - _cache.ts < CACHE_TTL) {
      setDados(_cache.dashData)
      setAppts(_cache.appts)
      setCaixa(_cache.caixaData)
      setEvolucao(_cache.evolucao)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [dashRes, caixaRes, evoRes] = await Promise.all([
        fetch(`/api/dashboard?from=${from}&to=${to}`).then(r => r.json()).catch(() => ({})),
        fetch("/api/caixa?resumo=true").then(r => r.json()).catch(() => ({})),
        fetch(`/api/financeiro/evolucao?ano=${new Date().getFullYear()}`).then(r => r.json()).catch(() => []),
      ])

      const apptsList = Array.isArray(dashRes?.agendamentosHoje) ? dashRes.agendamentosHoje : []
      const evo = Array.isArray(evoRes) ? evoRes : []

      if (dashRes && !dashRes.error) { setDados(dashRes); setAppts(apptsList) }
      if (caixaRes && !caixaRes.error) setCaixa(caixaRes)
      if (evo.length) setEvolucao(evo)

      // Atualiza cache
      _cache.dashData = dashRes && !dashRes.error ? dashRes : _cache.dashData
      _cache.appts = apptsList
      _cache.caixaData = caixaRes && !caixaRes.error ? caixaRes : _cache.caixaData
      _cache.evolucao = evo.length ? evo : _cache.evolucao
      _cache.periodKey = key
      _cache.ts = Date.now()
    } catch (e) { console.error("[dashboard]", e) }
    finally { setLoading(false) }
  }, [periodo, customFrom, customTo])

  useEffect(() => { fetchDados() }, [fetchDados])
  useEffect(() => {
    function onPay() { _cache.ts = 0; fetchDados(true) }
    window.addEventListener("pagamentoConfirmado", onPay)
    window.addEventListener("pagamentoPendente", onPay)
    return () => {
      window.removeEventListener("pagamentoConfirmado", onPay)
      window.removeEventListener("pagamentoPendente", onPay)
    }
  }, [fetchDados])

  const agora = new Date()
  const apptsDone = appts.filter(a => a.status === "DONE" || a.status === "IN_PROGRESS")
  const apptsProximos = appts
    .filter(a => !["CANCELLED","NO_SHOW","DONE"].includes(a.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 6)

  // Performance por barbeiro hoje
  const perfPorBarbeiro: Record<string, { nome: string; atend: number; receita: number }> = {}
  for (const a of appts.filter(a => a.status === "DONE")) {
    const id = a.professional.id
    if (!perfPorBarbeiro[id]) perfPorBarbeiro[id] = { nome: a.professional.name, atend: 0, receita: 0 }
    perfPorBarbeiro[id].atend++
    perfPorBarbeiro[id].receita += a.payment?.amount ?? a.service.price
  }
  const barbeiros = Object.values(perfPorBarbeiro).sort((a, b) => b.receita - a.receita)
  const maxReceita = barbeiros[0]?.receita || 1

  // Evolução mensal — últimos 6 meses
  const evoFiltrado = evolucao.slice(Math.max(0, new Date().getMonth() - 5), new Date().getMonth() + 1)
  const maxEvo = Math.max(...evoFiltrado.map(e => e.valor), 1)

  // Variação mês atual vs anterior
  const mesAtual = evolucao[new Date().getMonth()]?.valor ?? 0
  const mesAnterior = evolucao[new Date().getMonth() - 1]?.valor ?? 0
  const varMes = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : 0

  // Saldo do caixa
  const lancamentos = caixa?.lancamentos ?? []
  const saldoCaixa = lancamentos.reduce((s, l) => {
    if (l.tipo === "RECEITA") return s + l.valor
    return s - l.valor
  }, 0)
  const caixaAberto = caixa?.caixa && !caixa.caixa.closedAt

  function fmtHoraAppt(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }
  function isPast(iso: string) { return new Date(iso) < agora }

  // KPI carousel mobile
  const kpiRef = useRef<HTMLDivElement>(null)
  const [activeKPI, setActiveKPI] = useState(0)
  function handleKPIScroll() {
    const el = kpiRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 0) return
    setActiveKPI(Math.max(0, Math.min(4, Math.round((el.scrollLeft / maxScroll) * 4))))
  }

  const kpiCards = [
    // 0 — Faturamento
    <div key="fat" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden h-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
      <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-3">Faturamento</div>
      {loading ? <div className="h-8 bg-zinc-800 rounded-lg animate-pulse mb-2" />
        : <div className="text-amber-400 text-2xl font-bold tabular-nums">{fmtMoeda(dados?.faturamento ?? 0)}</div>}
      <div className="text-zinc-600 text-xs mt-1">serviços + produtos</div>
    </div>,
    // 1 — A receber
    <Link key="rec" href="/dashboard/pix"
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden hover:border-orange-500/30 transition-colors block h-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
      <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-3">A receber</div>
      {loading ? <div className="h-8 bg-zinc-800 rounded-lg animate-pulse mb-2" />
        : <div className="text-orange-400 text-2xl font-bold tabular-nums">{fmtMoeda(dados?.valorPendente ?? 0)}</div>}
      <div className="text-zinc-600 text-xs mt-1">
        {(dados?.pagamentosPendentes ?? 0)} pagamento{(dados?.pagamentosPendentes ?? 0) !== 1 ? "s" : ""} pendente
        {(dados?.pagamentosPendentes ?? 0) > 0 ? " · ver cobranças" : ""}
      </div>
    </Link>,
    // 2 — Atendimentos
    <div key="atd" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden h-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500/60 to-transparent" />
      <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-3">Atendimentos</div>
      {loading ? <div className="h-8 bg-zinc-800 rounded-lg animate-pulse mb-2" />
        : <div className="flex items-end gap-2">
            <div className="text-green-400 text-2xl font-bold tabular-nums">{dados?.atendimentos ?? 0}</div>
            {(dados?.pendentes ?? 0) > 0 && <div className="text-amber-400 text-sm font-medium mb-0.5">+{dados?.pendentes} fila</div>}
          </div>}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-zinc-600 text-xs">concluídos</span>
        {(dados?.cancelados ?? 0) > 0 && <span className="text-red-400/60 text-xs">{dados?.cancelados} cancelado{dados?.cancelados !== 1 ? "s" : ""}</span>}
      </div>
    </div>,
    // 3 — Ticket médio
    <div key="tkt" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden h-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
      <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-3">Ticket médio</div>
      {loading ? <div className="h-8 bg-zinc-800 rounded-lg animate-pulse mb-2" />
        : <div className="text-blue-400 text-2xl font-bold tabular-nums">{fmtMoeda(dados?.ticketMedio ?? 0)}</div>}
      <div className="text-zinc-600 text-xs mt-1">por atendimento</div>
    </div>,
    // 4 — Saldo caixa
    <div key="cx" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden h-full">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${caixaAberto ? "via-green-500/60" : "via-zinc-600/40"} to-transparent`} />
      <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-3">Saldo no caixa</div>
      {loading ? <div className="h-8 bg-zinc-800 rounded-lg animate-pulse mb-2" />
        : <div className={`text-2xl font-bold tabular-nums ${caixaAberto ? "text-white" : "text-zinc-600"}`}>{fmtMoeda(saldoCaixa)}</div>}
      <div className="text-zinc-600 text-xs mt-1">saldo atual · {lancamentos.length} lançamentos</div>
    </div>,
  ]

  return (
    <DashboardLayout>

      {/* ── STICKY: KPIs + FILTRO + CAIXA ── */}
      <div className="sticky top-11 z-20 bg-zinc-950 -mx-4 px-4 pt-4 pb-3 mb-2 border-b border-zinc-900">

      {/* ── KPIs CAROUSEL MOBILE ── */}
      <div className="md:hidden mb-3">
        <div ref={kpiRef} onScroll={handleKPIScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4"
          style={{ paddingInline: "13vw", scrollPaddingInline: "13vw", gap: "10px" }}>
          {kpiCards.map((card, i) => (
            <div key={i}
              className={`flex-shrink-0 snap-center transition-all duration-200 ${activeKPI === i ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}
              style={{ width: "74vw" }}>
              {card}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {kpiCards.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-200 ${activeKPI === i ? "w-5 h-1.5 bg-amber-500" : "w-1.5 h-1.5 bg-zinc-700"}`} />
          ))}
        </div>
      </div>

      {/* ── KPIs DESKTOP GRID ── */}
      <div className="hidden md:grid md:grid-cols-5 gap-3 mb-3">
        {kpiCards}
      </div>

      {/* ── FILTRO + STATUS CAIXA ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-0.5">
            {PERIODOS.map(p => (
              <button key={p.key} onClick={() => setPeriodo(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  periodo === p.key ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-zinc-200"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {periodo === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-amber-500 [color-scheme:dark]" />
              <span className="text-zinc-600 text-xs">até</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-amber-500 [color-scheme:dark]" />
            </div>
          )}
          {periodo !== "hoje" && (
            <span className="text-zinc-600 text-xs">
              {range.from === range.to ? range.from : `${range.from} → ${range.to}`}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-xs flex-shrink-0 ${caixaAberto ? "text-green-400" : "text-zinc-600"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${caixaAberto ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
          {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
        </div>
      </div>

      </div>{/* fim sticky */}

      <div className="mt-4">

      {/* ── SPLIT PRESENCIAL / DOMICÍLIO ── */}
      {!loading && dados?.split && (dados.split.presencial.atendimentos > 0 || dados.split.domicilio.atendimentos > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 hidden sm:flex">
              <span className="text-amber-400 text-sm">✂</span>
            </div>
            <div className="flex-1">
              <div className="text-zinc-500 text-xs">Presencial</div>
              <div className="text-white text-sm font-bold">{fmtMoeda(dados.split.presencial.receita)}</div>
              <div className="text-zinc-600 text-xs">{dados.split.presencial.atendimentos} atend.</div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 items-center justify-center flex-shrink-0 hidden sm:flex">
              <span className="text-teal-400 text-sm">🚗</span>
            </div>
            <div className="flex-1">
              <div className="text-zinc-500 text-xs">Domicílio</div>
              <div className="text-teal-400 text-sm font-bold">{fmtMoeda(dados.split.domicilio.receita)}</div>
              <div className="text-zinc-600 text-xs">{dados.split.domicilio.atendimentos} atend.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE: ordem personalizada ── */}
      <div className="md:hidden flex flex-col gap-4 mb-4">

        {/* 1. Faturamento mensal */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-zinc-300 text-sm font-semibold">Faturamento mensal</div>
              <div className="text-zinc-600 text-xs mt-0.5">{new Date().getFullYear()}</div>
            </div>
            {!loading && mesAtual > 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${varMes >= 0 ? "text-green-400" : "text-red-400"}`}>
                {varMes >= 0 ? "↑" : "↓"} {Math.abs(varMes).toFixed(1)}%
                <span className="text-zinc-600 text-xs font-normal ml-1">vs mês ant.</span>
              </div>
            )}
          </div>
          {loading ? (
            <div className="h-24 bg-zinc-800 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-end gap-1.5 h-24">
              {evoFiltrado.map((e, i) => {
                const isAtual = i === evoFiltrado.length - 1
                const h = e.valor > 0 ? Math.max(8, Math.round((e.valor / maxEvo) * 100)) : 4
                return (
                  <div key={e.mes} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className={`w-full rounded-t transition-all ${isAtual ? "bg-amber-500" : e.valor > 0 ? "bg-zinc-700 hover:bg-zinc-600" : "bg-zinc-800"}`}
                        style={{ height: `${h}%` }}
                        title={e.valor > 0 ? fmtMoeda(e.valor) : "Sem dados"}
                      />
                    </div>
                    <div className={`text-xs font-mono ${isAtual ? "text-amber-400 font-bold" : "text-zinc-600"}`}>{e.label}</div>
                  </div>
                )
              })}
            </div>
          )}
          {!loading && mesAtual > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
              <span className="text-zinc-500 text-xs">Este mês</span>
              <span className="text-amber-400 font-bold font-mono">{fmtMoeda(mesAtual)}</span>
            </div>
          )}
        </div>

        {/* 2. Top serviços */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <div className="text-zinc-300 text-sm font-semibold">Top serviços</div>
            <span className="text-zinc-700 text-xs">no período</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i=><div key={i} className="h-8 bg-zinc-800 rounded animate-pulse"/>)}</div>
          ) : !dados?.topServicos?.length ? (
            <div className="p-6 text-center text-zinc-700 text-sm">Sem dados no período</div>
          ) : (
            <div className="p-4 space-y-3">
              {dados.topServicos.map((s, i) => {
                const max = dados.topServicos[0].count
                return (
                  <div key={s.nome}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 text-xs w-4">{i+1}</span>
                        <span className="text-zinc-200 text-sm">{s.nome}</span>
                        <span className="text-zinc-600 text-xs">{s.count}×</span>
                      </div>
                      <span className="text-zinc-400 text-xs font-mono">{fmtMoeda(s.receita)}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-amber-500" : "bg-zinc-600"}`}
                        style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 3. Top produtos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <div className="text-zinc-300 text-sm font-semibold">Top produtos vendidos</div>
            <span className="text-zinc-700 text-xs">no período</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i=><div key={i} className="h-8 bg-zinc-800 rounded animate-pulse"/>)}</div>
          ) : !dados?.topProdutos?.length ? (
            <div className="p-6 text-center text-zinc-700 text-sm">Sem vendas de produtos no período</div>
          ) : (
            <div className="p-4 space-y-3">
              {dados.topProdutos.map((p, i) => {
                const max = dados.topProdutos[0].qtd
                return (
                  <div key={p.nome}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 text-xs w-4">{i+1}</span>
                        <span className="text-zinc-200 text-sm">{p.nome}</span>
                        <span className="text-zinc-600 text-xs">{p.qtd} un.</span>
                      </div>
                      <span className="text-zinc-400 text-xs font-mono">{fmtMoeda(p.receita)}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-blue-500" : "bg-zinc-600"}`}
                        style={{ width: `${(p.qtd / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 4. Clientes este mês */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Clientes este mês</div>
          <div className="flex items-end justify-between">
            {loading
              ? <div className="h-7 w-16 bg-zinc-800 rounded animate-pulse" />
              : <div className="text-white text-2xl font-bold">{dados?.mesAtualClientes ?? 0}</div>
            }
            {!loading && dados && dados.mesAnteriorClientes > 0 && (
              <div className={`text-xs font-semibold mb-1 ${dados.mesAtualClientes >= dados.mesAnteriorClientes ? "text-green-400" : "text-red-400"}`}>
                {fmtPct(((dados.mesAtualClientes - dados.mesAnteriorClientes) / dados.mesAnteriorClientes) * 100)}
              </div>
            )}
          </div>
          <div className="text-zinc-700 text-xs mt-1">
            {!loading && dados ? `${dados.mesAnteriorClientes} mês anterior` : ""}
          </div>
        </div>

        {/* 5. Clientes VIP */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Clientes VIP</div>
          {loading
            ? <div className="h-7 w-12 bg-zinc-800 rounded animate-pulse" />
            : <div className="text-purple-400 text-2xl font-bold">{dados?.clientesVip ?? 0}</div>
          }
          <Link href="/dashboard/clientes" className="text-zinc-700 hover:text-zinc-500 text-xs mt-1 block transition-colors">
            Ver base →
          </Link>
        </div>

        {/* 6. Ações rápidas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-3">Ações rápidas</div>
          <div className="space-y-1.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("abrirModalAgenda"))}
              className="w-full text-left text-sm text-zinc-300 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <span className="text-amber-500">◈</span> Novo agendamento
            </button>
            <Link href="/dashboard/pix"
              className="w-full text-left text-sm text-zinc-300 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2">
              <span className="text-green-500">◈</span> Gerar PIX
            </Link>
            <Link href="/dashboard/caixa"
              className="w-full text-left text-sm text-zinc-300 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2">
              <span className="text-blue-500">◈</span> Lançar no caixa
            </Link>
          </div>
        </div>

        {/* 7. Agenda de hoje */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <div className="text-zinc-300 text-sm font-semibold">Agenda de hoje</div>
            <Link href="/dashboard/agenda" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">Ver completa →</Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />)}</div>
          ) : apptsProximos.length === 0 && apptsDone.length === 0 ? (
            <div className="p-8 text-center text-zinc-700 text-sm">Nenhum agendamento hoje</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {apptsDone.slice(-2).map(a => (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3 opacity-50">
                  <div className="w-10 text-right text-zinc-600 text-xs font-mono flex-shrink-0">{fmtHoraAppt(a.scheduledAt)}</div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-zinc-400 text-sm truncate">{a.client.name}</span>
                    <span className="text-zinc-600 text-xs ml-2">{a.service.name}</span>
                  </div>
                  <div className="text-green-400 text-xs font-mono flex-shrink-0 line-through">{fmtMoeda(a.payment?.amount ?? a.service.price)}</div>
                </div>
              ))}
              {apptsProximos.map((a, idx) => {
                const isNext = idx === 0
                return (
                  <div key={a.id} className={`flex items-center gap-4 px-5 py-3 ${isNext ? "bg-amber-500/5" : ""}`}>
                    <div className={`w-10 text-right text-xs font-mono flex-shrink-0 ${isNext ? "text-amber-400 font-bold" : "text-zinc-500"}`}>{fmtHoraAppt(a.scheduledAt)}</div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isNext ? "bg-amber-500 animate-pulse" : "bg-zinc-700"}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${isNext ? "text-white" : "text-zinc-300"}`}>{a.client.name}</span>
                      <span className="text-zinc-600 text-xs ml-2">{a.service.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-zinc-500 text-xs font-mono">{a.professional.name.split(" ")[0]}</div>
                    </div>
                    <div className={`text-xs font-mono flex-shrink-0 ${isNext ? "text-amber-400" : "text-zinc-600"}`}>{fmtMoeda(a.service.price)}</div>
                  </div>
                )
              })}
              {apptsProximos.length === 0 && (
                <div className="px-5 py-4 text-zinc-700 text-sm">Sem próximos agendamentos</div>
              )}
            </div>
          )}
        </div>

        {/* 8. Barbeiros hoje */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <div className="text-zinc-300 text-sm font-semibold">Barbeiros hoje</div>
            <span className="text-zinc-700 text-xs">{apptsDone.length} atend.</span>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}</div>
          ) : barbeiros.length === 0 ? (
            <div className="p-8 text-center text-zinc-700 text-sm">Nenhum atendimento concluído</div>
          ) : (
            <div className="p-4 space-y-3">
              {barbeiros.map((b, idx) => (
                <div key={b.nome}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-bold w-4 ${idx === 0 ? "text-amber-400" : "text-zinc-600"}`}>#{idx+1}</div>
                      <span className="text-white text-sm font-medium">{b.nome.split(" ")[0]}</span>
                      <span className="text-zinc-600 text-xs">{b.atend} corte{b.atend !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="text-zinc-300 text-sm font-mono">{fmtMoeda(b.receita)}</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${idx === 0 ? "bg-amber-500" : "bg-zinc-600"}`}
                      style={{ width: `${(b.receita / maxReceita) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>{/* fim mobile */}

      {/* ── DESKTOP: layout em grade ── */}
      <div className="hidden md:block">

      {/* Linha central */}
      <div className="grid grid-cols-5 gap-4 mb-4">

        {/* Agenda de hoje */}
        <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <div className="text-zinc-300 text-sm font-semibold">Agenda de hoje</div>
            <Link href="/dashboard/agenda" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
              Ver completa →
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />)}
            </div>
          ) : apptsProximos.length === 0 && apptsDone.length === 0 ? (
            <div className="p-8 text-center text-zinc-700 text-sm">Nenhum agendamento hoje</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {/* Últimos concluídos (até 2) */}
              {apptsDone.slice(-2).map(a => (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3 opacity-50">
                  <div className="w-10 text-right text-zinc-600 text-xs font-mono flex-shrink-0">{fmtHoraAppt(a.scheduledAt)}</div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-zinc-400 text-sm truncate">{a.client.name}</span>
                    <span className="text-zinc-600 text-xs ml-2">{a.service.name}</span>
                  </div>
                  <div className="text-green-400 text-xs font-mono flex-shrink-0 line-through">{fmtMoeda(a.payment?.amount ?? a.service.price)}</div>
                </div>
              ))}
              {/* Próximos */}
              {apptsProximos.map((a, idx) => {
                const isNext = idx === 0
                return (
                  <div key={a.id} className={`flex items-center gap-4 px-5 py-3 ${isNext ? "bg-amber-500/5" : ""}`}>
                    <div className={`w-10 text-right text-xs font-mono flex-shrink-0 ${isNext ? "text-amber-400 font-bold" : "text-zinc-500"}`}>
                      {fmtHoraAppt(a.scheduledAt)}
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isNext ? "bg-amber-500 animate-pulse" : "bg-zinc-700"}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${isNext ? "text-white" : "text-zinc-300"}`}>{a.client.name}</span>
                      <span className="text-zinc-600 text-xs ml-2">{a.service.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-zinc-500 text-xs font-mono">{a.professional.name.split(" ")[0]}</div>
                    </div>
                    <div className={`text-xs font-mono flex-shrink-0 ${isNext ? "text-amber-400" : "text-zinc-600"}`}>
                      {fmtMoeda(a.service.price)}
                    </div>
                  </div>
                )
              })}
              {apptsProximos.length === 0 && (
                <div className="px-5 py-4 text-zinc-700 text-sm">Sem próximos agendamentos</div>
              )}
            </div>
          )}
        </div>

        {/* Performance barbeiros */}
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <div className="text-zinc-300 text-sm font-semibold">Barbeiros hoje</div>
            <span className="text-zinc-700 text-xs">{apptsDone.length} atend.</span>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}
            </div>
          ) : barbeiros.length === 0 ? (
            <div className="p-8 text-center text-zinc-700 text-sm">Nenhum atendimento concluído</div>
          ) : (
            <div className="p-4 space-y-3">
              {barbeiros.map((b, idx) => (
                <div key={b.nome}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-bold w-4 ${idx === 0 ? "text-amber-400" : "text-zinc-600"}`}>#{idx+1}</div>
                      <span className="text-white text-sm font-medium">{b.nome.split(" ")[0]}</span>
                      <span className="text-zinc-600 text-xs">{b.atend} corte{b.atend !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="text-zinc-300 text-sm font-mono">{fmtMoeda(b.receita)}</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${idx === 0 ? "bg-amber-500" : "bg-zinc-600"}`}
                      style={{ width: `${(b.receita / maxReceita) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── LINHA INFERIOR ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Evolução mensal */}
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-zinc-300 text-sm font-semibold">Faturamento mensal</div>
              <div className="text-zinc-600 text-xs mt-0.5">{new Date().getFullYear()}</div>
            </div>
            {!loading && mesAtual > 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${varMes >= 0 ? "text-green-400" : "text-red-400"}`}>
                {varMes >= 0 ? "↑" : "↓"} {Math.abs(varMes).toFixed(1)}%
                <span className="text-zinc-600 text-xs font-normal ml-1">vs mês ant.</span>
              </div>
            )}
          </div>
          {loading ? (
            <div className="h-24 bg-zinc-800 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-end gap-1.5 h-24">
              {evoFiltrado.map((e, i) => {
                const isAtual = i === evoFiltrado.length - 1
                const h = e.valor > 0 ? Math.max(8, Math.round((e.valor / maxEvo) * 100)) : 4
                return (
                  <div key={e.mes} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className={`w-full rounded-t transition-all ${isAtual ? "bg-amber-500" : e.valor > 0 ? "bg-zinc-700 hover:bg-zinc-600" : "bg-zinc-800"}`}
                        style={{ height: `${h}%` }}
                        title={e.valor > 0 ? fmtMoeda(e.valor) : "Sem dados"}
                      />
                    </div>
                    <div className={`text-xs font-mono ${isAtual ? "text-amber-400 font-bold" : "text-zinc-600"}`}>{e.label}</div>
                  </div>
                )
              })}
            </div>
          )}
          {!loading && mesAtual > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
              <span className="text-zinc-500 text-xs">Este mês</span>
              <span className="text-amber-400 font-bold font-mono">{fmtMoeda(mesAtual)}</span>
            </div>
          )}
        </div>

        {/* Métricas rápidas */}
        <div className="space-y-3">

          {/* Clientes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Clientes este mês</div>
            <div className="flex items-end justify-between">
              {loading
                ? <div className="h-7 w-16 bg-zinc-800 rounded animate-pulse" />
                : <div className="text-white text-2xl font-bold">{dados?.mesAtualClientes ?? 0}</div>
              }
              {!loading && dados && dados.mesAnteriorClientes > 0 && (
                <div className={`text-xs font-semibold mb-1 ${dados.mesAtualClientes >= dados.mesAnteriorClientes ? "text-green-400" : "text-red-400"}`}>
                  {fmtPct(((dados.mesAtualClientes - dados.mesAnteriorClientes) / dados.mesAnteriorClientes) * 100)}
                </div>
              )}
            </div>
            <div className="text-zinc-700 text-xs mt-1">
              {!loading && dados ? `${dados.mesAnteriorClientes} mês anterior` : ""}
            </div>
          </div>

          {/* VIPs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Clientes VIP</div>
            {loading
              ? <div className="h-7 w-12 bg-zinc-800 rounded animate-pulse" />
              : <div className="text-purple-400 text-2xl font-bold">{dados?.clientesVip ?? 0}</div>
            }
            <Link href="/dashboard/clientes" className="text-zinc-700 hover:text-zinc-500 text-xs mt-1 block transition-colors">
              Ver base →
            </Link>
          </div>

          {/* Ações rápidas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-3">Ações rápidas</div>
            <div className="space-y-1.5">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("abrirModalAgenda"))}
                className="w-full text-left text-sm text-zinc-300 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <span className="text-amber-500">◈</span> Novo agendamento
              </button>
              <Link href="/dashboard/pix"
                className="w-full text-left text-sm text-zinc-300 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2">
                <span className="text-green-500">◈</span> Gerar PIX
              </Link>
              <Link href="/dashboard/caixa"
                className="w-full text-left text-sm text-zinc-300 hover:text-white py-1.5 px-2.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2">
                <span className="text-blue-500">◈</span> Lançar no caixa
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* ── TOP SERVIÇOS E PRODUTOS ── */}
      <div className="grid grid-cols-2 gap-4 mt-4">

        {/* Top serviços */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <div className="text-zinc-300 text-sm font-semibold">Top serviços</div>
            <span className="text-zinc-700 text-xs">no período</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i=><div key={i} className="h-8 bg-zinc-800 rounded animate-pulse"/>)}</div>
          ) : !dados?.topServicos?.length ? (
            <div className="p-6 text-center text-zinc-700 text-sm">Sem dados no período</div>
          ) : (
            <div className="p-4 space-y-3">
              {dados.topServicos.map((s, i) => {
                const max = dados.topServicos[0].count
                return (
                  <div key={s.nome}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 text-xs w-4">{i+1}</span>
                        <span className="text-zinc-200 text-sm">{s.nome}</span>
                        <span className="text-zinc-600 text-xs">{s.count}×</span>
                      </div>
                      <span className="text-zinc-400 text-xs font-mono">{fmtMoeda(s.receita)}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-amber-500" : "bg-zinc-600"}`}
                        style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top produtos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <div className="text-zinc-300 text-sm font-semibold">Top produtos vendidos</div>
            <span className="text-zinc-700 text-xs">no período</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i=><div key={i} className="h-8 bg-zinc-800 rounded animate-pulse"/>)}</div>
          ) : !dados?.topProdutos?.length ? (
            <div className="p-6 text-center text-zinc-700 text-sm">Sem vendas de produtos no período</div>
          ) : (
            <div className="p-4 space-y-3">
              {dados.topProdutos.map((p, i) => {
                const max = dados.topProdutos[0].qtd
                return (
                  <div key={p.nome}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 text-xs w-4">{i+1}</span>
                        <span className="text-zinc-200 text-sm">{p.nome}</span>
                        <span className="text-zinc-600 text-xs">{p.qtd} un.</span>
                      </div>
                      <span className="text-zinc-400 text-xs font-mono">{fmtMoeda(p.receita)}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-blue-500" : "bg-zinc-600"}`}
                        style={{ width: `${(p.qtd / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      </div>{/* fim desktop */}

      </div>{/* fim mt-4 */}

    </DashboardLayout>
  )
}
