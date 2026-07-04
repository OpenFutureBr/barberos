"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { fetchJsonSafe } from "@/lib/safe-fetch"
import { BucketPeriodo, CoresGrafico, lerCoresGrafico, salvarCoresGrafico, exportarExcel } from "@/lib/caixa-utils"
import { IconLista, IconGrid, IconGrafico, IconDownload } from "@/components/caixa/icons"
import PeriodoGrid from "@/components/caixa/PeriodoGrid"
import PeriodoGrafico from "@/components/caixa/PeriodoGrafico"
import SeletorCores from "@/components/caixa/SeletorCores"

function fmtDataISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Visão máxima permitida: M-3 em relação à data atual
function limiteMinimoFluxo() {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return fmtDataISO(d)
}

function periodoPadraoFluxo() {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - 30)
  return { from: fmtDataISO(inicio), to: fmtDataISO(hoje) }
}

function IconFluxo() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6.5h11" />
      <path d="M1 2.5h5M1 10.5h5" />
      <path d="M9 4.5l2 2-2 2" />
    </svg>
  )
}

type DetalheItem = { label: string; valor: number }

type FluxoLancamento = { desc: string; valor: number; tipo: string }
type FluxoPrevista = { desc: string; valor: number; clienteId: string }

type FluxoDia = {
  data: string
  entradas: FluxoLancamento[]
  saidas: FluxoLancamento[]
  previstas: FluxoPrevista[]
  totalEntradas: number
  totalSaidas: number
  totalPrevistas: number
  receitaProjetada: number
  saldo: number
}

type FluxoCaixa = {
  days: FluxoDia[]
  totalEntradas: number
  totalSaidas: number
  totalPrevistas: number
  totalProjetado: number
  saldoFinal: number
}

type Lancamento = {
  id: string
  tipo: string
  descricao: string
  valor: number
  method: string | null
  createdAt: string
  origem: "pagamento" | "produto" | "manual"
  detalhes: DetalheItem[] | null
  txId?: string
}

type Caixa = {
  id: string
  openedAt: string
  closedAt: string | null
  openingAmount: number
}

type ViewMode = "lista" | "grid" | "grafico"
type Granularidade = "diaria" | "semanal" | "mensal"

const tipoStyle: Record<string, string> = {
  RECEITA: "text-green-400",
  DESPESA: "text-red-400",
  SANGRIA: "text-amber-400",
}

const tipoSinal: Record<string, string> = {
  RECEITA: "+",
  DESPESA: "−",
  SANGRIA: "−",
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function metodoBadge(method: string | null): string {
  if (!method) return "bg-zinc-700 text-zinc-400"
  const m = method.toUpperCase()
  if (m === "PIX") return "bg-green-500/10 text-green-400 border border-green-500/20"
  if (m === "CARD" || m === "CARTÃO" || m === "CARD_CREDITO" || m === "CARD_DEBITO") return "bg-blue-500/10 text-blue-400 border border-blue-500/20"
  return "bg-zinc-700 text-zinc-300 border border-zinc-600"
}

function metodoLabel(method: string | null): string {
  if (!method) return ""
  const m = method.toUpperCase()
  if (m === "PIX") return "PIX"
  if (m === "CASH") return "Dinheiro"
  if (m === "CARD" || m === "CARD_CREDITO") return "Crédito"
  if (m === "CARD_DEBITO") return "Débito"
  return method
}

// ── Bucketing: Caixa de hoje (por hora) ─────────────────────────────────────
function construirBucketsHora(lancamentos: Lancamento[]): BucketPeriodo[] {
  const buckets: BucketPeriodo[] = Array.from({ length: 24 }, (_, h) => ({
    chave: String(h).padStart(2, "0"),
    label: `${String(h).padStart(2, "0")}h`,
    entradas: 0,
    saidas: 0,
    porTipoEntrada: {},
    porTipoSaida: {},
  }))

  for (const l of lancamentos) {
    const h = new Date(l.createdAt).getHours()
    const b = buckets[h]
    if (l.tipo === "RECEITA") {
      b.entradas += l.valor
      b.porTipoEntrada[l.tipo] = (b.porTipoEntrada[l.tipo] ?? 0) + l.valor
    } else {
      b.saidas += l.valor
      b.porTipoSaida[l.tipo] = (b.porTipoSaida[l.tipo] ?? 0) + l.valor
    }
  }

  return buckets
}

// ── Bucketing: Fluxo de caixa (por dia, agrupável em semana/mês) ───────────
function diaParaBucket(dia: FluxoDia): BucketPeriodo {
  const [, mm, dd] = dia.data.split("-")
  const porTipoEntrada: Record<string, number> = {}
  for (const e of dia.entradas) porTipoEntrada[e.tipo] = (porTipoEntrada[e.tipo] ?? 0) + e.valor
  const porTipoSaida: Record<string, number> = {}
  for (const s of dia.saidas) porTipoSaida[s.tipo] = (porTipoSaida[s.tipo] ?? 0) + s.valor

  return {
    chave: dia.data,
    label: `${dd}/${mm}`,
    diaSemana: new Date(`${dia.data}T12:00:00`).getDay(),
    entradas: dia.totalEntradas,
    saidas: dia.totalSaidas,
    projecao: dia.receitaProjetada,
    porTipoEntrada,
    porTipoSaida,
  }
}

function chaveSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  const diaSemana = (d.getDay() + 6) % 7 // 0 = segunda-feira
  const seg = new Date(d)
  seg.setDate(d.getDate() - diaSemana)
  return fmtDataISO(seg)
}

function chaveMes(iso: string) {
  return iso.slice(0, 7)
}

function agruparBuckets(diarios: BucketPeriodo[], granularidade: Granularidade): BucketPeriodo[] {
  if (granularidade === "diaria") return diarios

  const chaveFn = granularidade === "semanal" ? chaveSemana : chaveMes
  const map = new Map<string, BucketPeriodo>()

  for (const d of diarios) {
    const k = chaveFn(d.chave)
    if (!map.has(k)) {
      const label = granularidade === "semanal"
        ? `Sem ${new Date(`${k}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
        : new Date(`${k}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      map.set(k, { chave: k, label, entradas: 0, saidas: 0, projecao: 0, porTipoEntrada: {}, porTipoSaida: {} })
    }
    const b = map.get(k)!
    b.entradas += d.entradas
    b.saidas += d.saidas
    b.projecao = (b.projecao ?? 0) + (d.projecao ?? 0)
    for (const [t, v] of Object.entries(d.porTipoEntrada)) b.porTipoEntrada[t] = (b.porTipoEntrada[t] ?? 0) + v
    for (const [t, v] of Object.entries(d.porTipoSaida)) b.porTipoSaida[t] = (b.porTipoSaida[t] ?? 0) + v
  }

  return Array.from(map.values()).sort((a, b) => a.chave.localeCompare(b.chave))
}

function ToggleView({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
      {([
        { key: "lista" as const, icon: <IconLista />, label: "Lista" },
        { key: "grid" as const, icon: <IconGrid />, label: "Grid" },
        { key: "grafico" as const, icon: <IconGrafico />, label: "Gráfico" },
      ]).map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          title={opt.label}
          className={`p-1.5 rounded-md transition-all ${
            view === opt.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}

export default function CaixaPage() {
  const [abaCaixa, setAbaCaixa] = useState<"hoje" | "fluxo">("hoje")

  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  // Cores customizáveis dos gráficos — persistidas por usuário/navegador
  const [cores, setCores] = useState<CoresGrafico>(() => ({ entrada: "#22c55e", saida: "#ef4444", projecao: "#a855f7" }))
  useEffect(() => { setCores(lerCoresGrafico()) }, [])
  function mudarCores(novas: CoresGrafico) {
    setCores(novas)
    salvarCoresGrafico(novas)
  }

  // Visão (Lista/Grid/Gráfico) e seleção por drill-down, para cada aba
  const [viewHoje, setViewHoje] = useState<ViewMode>("lista")
  const [bucketHoje, setBucketHoje] = useState<string | null>(null)

  const [viewFluxo, setViewFluxo] = useState<ViewMode>("lista")
  const [granularidadeFluxo, setGranularidadeFluxo] = useState<Granularidade>("diaria")
  const [bucketFluxo, setBucketFluxo] = useState<string | null>(null)

  // Fluxo de caixa (movido de Financeiro) — filtro por intervalo de datas,
  // padrão últimos 30 dias, limitado a M-3 em relação a hoje
  const limiteMinimoFluxoData = useMemo(() => limiteMinimoFluxo(), [])
  const [fluxoFrom, setFluxoFrom] = useState(() => periodoPadraoFluxo().from)
  const [fluxoTo, setFluxoTo] = useState(() => periodoPadraoFluxo().to)
  const [fluxo, setFluxo] = useState<FluxoCaixa | null>(null)
  const [loadingFluxo, setLoadingFluxo] = useState(false)

  // Modal lançamento
  const [modalLancamento, setModalLancamento] = useState(false)
  const [tipo, setTipo] = useState("DESPESA")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [metodo, setMetodo] = useState("PIX")

  // Modal fechar caixa
  const [modalFechar, setModalFechar] = useState(false)
  const [valorFechamento, setValorFechamento] = useState("")
  const [detalheTipo, setDetalheTipo] = useState<string | null>(null)

  const caixaAberto = caixa !== null && caixa.closedAt === null

  const fetchDados = useCallback(() => {
    setLoading(true)
    // fetchJsonSafe mantém o último dado bom se a busca falhar — nunca zera
    // caixa/lançamentos por causa de uma falha transitória (ex: pool de conexões).
    fetchJsonSafe<{ caixa: Caixa | null; lancamentos: Lancamento[] }>("/api/caixa", "caixa:hoje")
      .then(d => {
        if (!d) return
        setCaixa(d.caixa ?? null)
        setLancamentos(Array.isArray(d.lancamentos) ? d.lancamentos : [])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchDados() }, [fetchDados])

  // Recarrega quando um pagamento é confirmado
  useEffect(() => {
    window.addEventListener("pagamentoConfirmado", fetchDados)
    return () => window.removeEventListener("pagamentoConfirmado", fetchDados)
  }, [fetchDados])

  // Fluxo de caixa — busca só quando a aba é aberta ou o período muda
  useEffect(() => {
    if (abaCaixa !== "fluxo" || !fluxoFrom || !fluxoTo) return
    setLoadingFluxo(true)
    fetchJsonSafe<typeof fluxo>(
      `/api/financeiro/fluxo?from=${fluxoFrom}&to=${fluxoTo}`,
      `financeiro:fluxo:${fluxoFrom}:${fluxoTo}`,
    )
      .then(d => { if (d?.days) setFluxo(d) })
      .finally(() => setLoadingFluxo(false))
  }, [abaCaixa, fluxoFrom, fluxoTo])

  const receitas = lancamentos.filter(l => l.tipo === "RECEITA").reduce((s, l) => s + l.valor, 0)
  const despesas = lancamentos.filter(l => l.tipo === "DESPESA").reduce((s, l) => s + l.valor, 0)
  const sangrias = lancamentos.filter(l => l.tipo === "SANGRIA").reduce((s, l) => s + l.valor, 0)
  const saldo = receitas - despesas - sangrias

  const bucketsHoje = useMemo(() => construirBucketsHora(lancamentos), [lancamentos])
  const bucketHojeAtivo = bucketHoje ? bucketsHoje.find(b => b.chave === bucketHoje) ?? null : null

  const bucketsFluxoDiario = useMemo(() => (fluxo?.days ?? []).map(diaParaBucket), [fluxo])
  const bucketsFluxo = useMemo(() => agruparBuckets(bucketsFluxoDiario, granularidadeFluxo), [bucketsFluxoDiario, granularidadeFluxo])
  const bucketFluxoAtivo = bucketFluxo ? bucketsFluxo.find(b => b.chave === bucketFluxo) ?? null : null

  // Limpa seleção de drill-down ao trocar granularidade (as chaves mudam de sentido)
  useEffect(() => { setBucketFluxo(null) }, [granularidadeFluxo])

  async function handleAbrirCaixa() {
    setSalvando(true)
    await fetch("/api/caixa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abrir", openingAmount: 0 }),
    })
    fetchDados()
    setSalvando(false)
  }

  async function handleFecharCaixa(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvando(true)
    await fetch("/api/caixa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fechar", closingAmount: parseFloat(valorFechamento) || saldo }),
    })
    setModalFechar(false)
    fetchDados()
    setSalvando(false)
  }

  async function handleLancamento(e: { preventDefault: () => void }) {
    e.preventDefault()
    const v = parseFloat(valor.replace(",", "."))
    if (isNaN(v) || v <= 0) return
    setSalvando(true)
    await fetch("/api/caixa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lancar", tipo, descricao, valor: v, metodo }),
    })
    setModalLancamento(false)
    setDescricao(""); setValor(""); setTipo("DESPESA"); setMetodo("PIX")
    fetchDados()
    setSalvando(false)
  }

  function baixarExcelHoje() {
    exportarExcel(
      `caixa-hoje-${fmtDataISO(new Date())}`,
      ["Hora", "Descrição", "Método", "Tipo", "Valor"],
      lancamentos.map(l => [fmtHora(l.createdAt), l.descricao, metodoLabel(l.method), l.tipo, l.valor * (l.tipo === "RECEITA" ? 1 : -1)]),
    )
  }

  function baixarExcelFluxo() {
    if (!fluxo) return
    const linhas: (string | number)[][] = []
    for (const dia of fluxo.days) {
      for (const e of dia.entradas) linhas.push([dia.data, "Entrada", e.tipo, e.desc, e.valor])
      for (const s of dia.saidas) linhas.push([dia.data, "Saída", s.tipo, s.desc, -s.valor])
    }
    exportarExcel(`fluxo-caixa-${fluxoFrom}-a-${fluxoTo}`, ["Data", "Direção", "Tipo", "Descrição", "Valor"], linhas)
  }

  return (
    <DashboardLayout>

      {/* Header: abas + ações na mesma linha */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setAbaCaixa("hoje")}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              abaCaixa === "hoje" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Caixa de hoje
          </button>
          <button
            onClick={() => setAbaCaixa("fluxo")}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              abaCaixa === "fluxo" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <IconFluxo />
            Fluxo de caixa
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalLancamento(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors"
          >
            + Lançamento
          </button>
          {caixaAberto ? (
            <button
              onClick={() => setModalFechar(true)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm border border-red-500/20 transition-colors"
            >
              Fechar caixa
            </button>
          ) : (
            <button
              onClick={handleAbrirCaixa}
              disabled={salvando}
              className="bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-400 px-4 py-2 rounded-lg text-sm border border-green-500/20 transition-colors"
            >
              Abrir caixa
            </button>
          )}
        </div>
      </div>

      {abaCaixa === "hoje" && (
      <>
      {/* Cabeçalho fixo: status + KPIs, independente do scroll */}
      <div className="sticky top-11 z-10 bg-zinc-950 pb-3">
        {/* Status */}
        <div className={`rounded-xl p-4 mb-4 border ${caixaAberto ? "bg-green-500/5 border-green-500/20" : "bg-zinc-900 border-zinc-800"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${caixaAberto ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
              <span className={`text-sm font-medium ${caixaAberto ? "text-green-400" : "text-zinc-500"}`}>
                {caixaAberto ? "Caixa Aberto" : caixa?.closedAt ? "Caixa Fechado" : "Caixa não aberto hoje"}
              </span>
            </div>
            <div className="text-right">
              <div className="text-zinc-500 text-xs">Saldo atual</div>
              {loading
                ? <div className="h-7 w-28 bg-zinc-800 rounded animate-pulse mt-1" />
                : <div className="text-white text-2xl font-bold">{fmtMoeda(saldo)}</div>
              }
            </div>
          </div>
        </div>

        {/* KPIs — refletem o bucket selecionado no drill-down, se houver */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
              Receitas {bucketHojeAtivo && <span className="text-amber-400">· {bucketHojeAtivo.label}</span>}
            </div>
            {loading ? <div className="h-6 bg-zinc-800 rounded animate-pulse" /> : <div className="text-green-400 text-xl font-bold">{fmtMoeda(bucketHojeAtivo ? bucketHojeAtivo.entradas : receitas)}</div>}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
              Despesas {bucketHojeAtivo && <span className="text-amber-400">· {bucketHojeAtivo.label}</span>}
            </div>
            {loading ? <div className="h-6 bg-zinc-800 rounded animate-pulse" /> : <div className="text-red-400 text-xl font-bold">{fmtMoeda(bucketHojeAtivo ? bucketHojeAtivo.saidas : despesas)}</div>}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Sangrias</div>
            {loading ? <div className="h-6 bg-zinc-800 rounded animate-pulse" /> : <div className="text-amber-400 text-xl font-bold">{fmtMoeda(sangrias)}</div>}
          </div>
        </div>
      </div>

      {/* Container da tabela/grid/gráfico */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
          <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Lançamentos do dia</span>
          <div className="flex items-center gap-2">
            {viewHoje === "grafico" && <SeletorCores cores={cores} onMudar={mudarCores} mostrarProjecao={false} />}
            <ToggleView view={viewHoje} onChange={setViewHoje} />
            <button onClick={baixarExcelHoje} title="Baixar lista em Excel" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 p-2 rounded-lg border border-zinc-700 transition-colors">
              <IconDownload />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-600 text-sm">Carregando...</div>
        ) : viewHoje === "grid" ? (
          <div className="p-4">
            <PeriodoGrid buckets={bucketsHoje} granularidade="hora" cores={cores} selecionado={bucketHoje} onSelecionar={setBucketHoje} />
          </div>
        ) : viewHoje === "grafico" ? (
          <div className="p-4">
            <PeriodoGrafico buckets={bucketsHoje} cores={cores} selecionado={bucketHoje} onSelecionar={setBucketHoje} />
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm">Nenhum lançamento hoje</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Hora</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Descrição</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Método</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l, i) => {
                const expandido = expandidoId === l.id
                const clicavel = !!l.detalhes
                return (
                  <React.Fragment key={l.id}>
                    <tr
                      onClick={() => clicavel && setExpandidoId(expandido ? null : l.id)}
                      className={`border-b border-zinc-800 transition-colors ${i === lancamentos.length - 1 && !expandido ? "border-0" : ""} ${clicavel ? "hover:bg-zinc-800/40 cursor-pointer" : ""} ${expandido ? "bg-zinc-800/30" : ""}`}>
                      <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{fmtHora(l.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-300 text-sm">{l.descricao}</span>
                          {clicavel && <span className={`text-zinc-600 text-xs transition-transform ${expandido ? "rotate-90" : ""}`} style={{ display: "inline-block", transition: "transform 0.15s" }}>›</span>}
                        </div>
                        {l.detalhes && l.detalhes.length > 1 && !expandido && (
                          <div className="text-zinc-600 text-xs mt-0.5">+ {l.detalhes.length - 1} produto{l.detalhes.length > 2 ? "s" : ""}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {l.method && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${metodoBadge(l.method)}`}>
                            {metodoLabel(l.method)}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold font-mono ${tipoStyle[l.tipo] ?? "text-zinc-400"}`}>
                        {tipoSinal[l.tipo] ?? ""}R$ {l.valor.toFixed(2)}
                      </td>
                    </tr>
                    {expandido && l.detalhes && (
                      <tr className="border-b border-zinc-800">
                        <td />
                        <td colSpan={3} className="px-4 pb-3 pt-0">
                          <div className="bg-zinc-800/60 rounded-lg overflow-hidden">
                            {l.detalhes.map((d, di) => (
                              <div key={di} className={`flex justify-between px-3 py-1.5 text-sm ${di < l.detalhes!.length - 1 ? "border-b border-zinc-700/50" : ""}`}>
                                <span className="text-zinc-400">{d.label}</span>
                                <span className="text-zinc-200 font-mono">R$ {d.valor.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between px-3 py-1.5 border-t border-zinc-700 bg-zinc-800/80">
                              <span className="text-zinc-400 text-sm font-medium">Total · {metodoLabel(l.method) || "—"}</span>
                              <span className={`font-bold font-mono text-sm ${tipoStyle[l.tipo] ?? "text-white"}`}>R$ {l.valor.toFixed(2)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      </>
      )}

      {abaCaixa === "fluxo" && (
        <div className="space-y-3">
          {/* Cabeçalho fixo: cards + filtro, independente do scroll */}
          <div className="sticky top-11 z-10 bg-zinc-950 pb-3 space-y-3">
            {/* Resumo do período — reflete o bucket selecionado no drill-down, se houver */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">
                  Entradas {bucketFluxoAtivo && <span className="text-amber-400 normal-case">· {bucketFluxoAtivo.label}</span>}
                </div>
                {loadingFluxo ? (
                  <div className="h-7 bg-green-500/10 rounded animate-pulse" />
                ) : (
                  <div className="text-green-400 text-xl font-bold">{fmtMoeda(bucketFluxoAtivo ? bucketFluxoAtivo.entradas : fluxo?.totalEntradas ?? 0)}</div>
                )}
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <div className="text-red-400 text-xs font-mono uppercase tracking-widest mb-1">
                  Saídas {bucketFluxoAtivo && <span className="text-amber-400 normal-case">· {bucketFluxoAtivo.label}</span>}
                </div>
                {loadingFluxo ? (
                  <div className="h-7 bg-red-500/10 rounded animate-pulse" />
                ) : (
                  <div className="text-red-400 text-xl font-bold">{fmtMoeda(bucketFluxoAtivo ? bucketFluxoAtivo.saidas : fluxo?.totalSaidas ?? 0)}</div>
                )}
              </div>
              {(() => {
                const saldoExibido = bucketFluxoAtivo ? bucketFluxoAtivo.entradas - bucketFluxoAtivo.saidas : fluxo?.saldoFinal ?? 0
                return (
                  <div className={`border rounded-xl p-4 ${saldoExibido >= 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                    <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${saldoExibido >= 0 ? "text-amber-400" : "text-red-400"}`}>Saldo</div>
                    {loadingFluxo ? (
                      <div className="h-7 bg-amber-500/10 rounded animate-pulse" />
                    ) : (
                      <div className={`text-xl font-bold ${saldoExibido >= 0 ? "text-amber-400" : "text-red-400"}`}>{fmtMoeda(saldoExibido)}</div>
                    )}
                  </div>
                )
              })()}
              <div className="bg-purple-500/5 border border-dashed border-purple-500/30 rounded-xl p-4">
                <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-1">Projeção de receita</div>
                {loadingFluxo ? (
                  <div className="h-7 bg-purple-500/10 rounded animate-pulse" />
                ) : (
                  <div className="text-purple-400 text-xl font-bold">{fmtMoeda(bucketFluxoAtivo ? bucketFluxoAtivo.projecao ?? 0 : fluxo?.totalProjetado ?? 0)}</div>
                )}
                <div className="text-purple-600/60 text-xs mt-1">pendentes + agendamentos futuros</div>
              </div>
            </div>

            {/* Filtro — abaixo dos cards */}
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <span className="text-zinc-500 text-xs">De</span>
              <input
                type="date"
                value={fluxoFrom}
                min={limiteMinimoFluxoData}
                max={fluxoTo}
                onChange={(e) => setFluxoFrom(e.target.value < limiteMinimoFluxoData ? limiteMinimoFluxoData : e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
              <span className="text-zinc-500 text-xs">até</span>
              <input
                type="date"
                value={fluxoTo}
                min={fluxoFrom}
                onChange={(e) => setFluxoTo(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
              {viewFluxo === "grafico" && (
                <div className="flex gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
                  {([
                    { key: "diaria" as const, label: "Diária" },
                    { key: "semanal" as const, label: "Semanal" },
                    { key: "mensal" as const, label: "Mensal" },
                  ]).map(opt => (
                    <button key={opt.key} onClick={() => setGranularidadeFluxo(opt.key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        granularidadeFluxo === opt.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Container da tabela/grid/gráfico */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
              <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Fluxo de Caixa</span>
              <div className="flex items-center gap-2">
                {viewFluxo === "grafico" && <SeletorCores cores={cores} onMudar={mudarCores} mostrarProjecao />}
                <ToggleView view={viewFluxo} onChange={setViewFluxo} />
                <button onClick={baixarExcelFluxo} title="Baixar lista em Excel" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 p-2 rounded-lg border border-zinc-700 transition-colors">
                  <IconDownload />
                </button>
              </div>
            </div>

            {loadingFluxo ? (
              <div className="px-4 py-8 text-center text-zinc-600 text-sm">Carregando...</div>
            ) : viewFluxo === "grid" ? (
              <div className="p-4">
                <PeriodoGrid buckets={bucketsFluxo} granularidade="dia" cores={cores} selecionado={bucketFluxo} onSelecionar={setBucketFluxo} />
              </div>
            ) : viewFluxo === "grafico" ? (
              <div className="p-4">
                <PeriodoGrafico buckets={bucketsFluxo} cores={cores} mostrarProjecao selecionado={bucketFluxo} onSelecionar={setBucketFluxo} />
              </div>
            ) : !fluxo || fluxo.days.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-zinc-600 text-sm">Nenhum movimento no período</div>
                <div className="text-zinc-700 text-xs mt-1">
                  As entradas e saídas do caixa aparecerão aqui organizadas por dia
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {fluxo.days.map((dia) => {
                  const [, mm, dd] = dia.data.split("-")
                  const dataFmt = `${dd}/${mm}`
                  const temSaidas = dia.saidas.length > 0
                  const temPrevistas = (dia.previstas?.length ?? 0) > 0
                  return (
                    <div key={dia.data} className="p-4 hover:bg-zinc-800/20 transition-colors">
                      {/* Cabeçalho do dia */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-center flex-shrink-0">
                            <div className="text-white text-sm font-bold leading-none">{dd}</div>
                            <div className="hidden">{mm}</div>
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">{dataFmt}</div>
                            <div className="text-zinc-600 text-xs">
                              {dia.entradas.length + dia.saidas.length} lançamento{dia.entradas.length + dia.saidas.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono font-bold text-sm ${dia.saldo >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {fmtMoeda(dia.saldo)}
                          </div>
                          <div className="text-zinc-600 text-xs">saldo acum.</div>
                        </div>
                      </div>

                      {/* Lançamentos */}
                      <div className="space-y-1 pl-13">
                        {dia.entradas.map((e, i) => (
                          <div key={`e-${i}`} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-green-500/5 border border-green-500/10">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-green-500 text-xs flex-shrink-0">↑</span>
                              <span className="text-zinc-300 text-xs truncate">{e.desc}</span>
                            </div>
                            <span className="text-green-400 text-xs font-mono font-semibold flex-shrink-0 ml-2">
                              +{fmtMoeda(e.valor)}
                            </span>
                          </div>
                        ))}
                        {temSaidas && dia.saidas.map((s, i) => (
                          <div key={`s-${i}`} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-red-500/5 border border-red-500/10">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-red-500 text-xs flex-shrink-0">↓</span>
                              <span className="text-zinc-300 text-xs truncate">{s.desc}</span>
                            </div>
                            <span className="text-red-400 text-xs font-mono font-semibold flex-shrink-0 ml-2">
                              -{fmtMoeda(s.valor)}
                            </span>
                          </div>
                        ))}
                        {temPrevistas && dia.previstas.map((p, i) => (
                          <div key={`p-${i}`} className="flex items-center justify-between py-1.5 px-3 rounded-lg border border-dashed border-purple-500/30 bg-purple-500/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-purple-400/70 text-xs flex-shrink-0">◌</span>
                              <span className="text-zinc-500 text-xs truncate">{p.desc}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 leading-none flex-shrink-0">previsto</span>
                            </div>
                            <span className="text-purple-400/70 text-xs font-mono font-semibold flex-shrink-0 ml-2">
                              +{fmtMoeda(p.valor)}
                            </span>
                          </div>
                        ))}
                        {/* Mini resumo do dia */}
                        <div className="flex justify-end gap-3 pt-1 pr-1">
                          <span className="text-green-500/70 text-xs font-mono">+{fmtMoeda(dia.totalEntradas)}</span>
                          {temSaidas && <span className="text-red-500/70 text-xs font-mono">-{fmtMoeda(dia.totalSaidas)}</span>}
                          {temPrevistas && <span className="text-purple-400/60 text-xs font-mono">◌{fmtMoeda(dia.totalPrevistas ?? 0)}</span>}
                          <span className={`text-xs font-mono font-bold ${(dia.totalEntradas - dia.totalSaidas) >= 0 ? "text-zinc-300" : "text-red-400"}`}>
                            = {fmtMoeda(dia.totalEntradas - dia.totalSaidas)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Rodapé total */}
                <div className="flex items-center justify-between px-4 py-4 bg-zinc-800/40">
                  <div className="flex items-center gap-4">
                    <span className="text-green-400 text-sm font-mono">↑ {fmtMoeda(fluxo.totalEntradas)}</span>
                    <span className="text-red-400 text-sm font-mono">↓ {fmtMoeda(fluxo.totalSaidas)}</span>
                    {(fluxo.totalPrevistas ?? 0) > 0 && (
                      <span className="text-purple-400/70 text-sm font-mono">◌ {fmtMoeda(fluxo.totalPrevistas)} previsto</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-500 text-xs mb-0.5">Saldo final do período</div>
                    <div className={`font-bold font-mono text-base ${fluxo.saldoFinal >= 0 ? "text-amber-400" : "text-red-400"}`}>
                      {fmtMoeda(fluxo.saldoFinal)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal — novo lançamento */}
      {modalLancamento && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Lançamento</h2>
              <button onClick={() => setModalLancamento(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleLancamento} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Tipo *</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "DESPESA", label: "Despesa", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
                    { key: "SANGRIA", label: "Sangria", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
                    { key: "RECEITA", label: "Receita", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
                  ]).map(t => (
                    <button key={t.key} type="button" onClick={() => setTipo(t.key)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${tipo === t.key ? t.cls : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Descrição *</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} required
                  placeholder="Ex: Compra de produtos"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Valor (R$) *</label>
                <input value={valor} onChange={e => setValor(e.target.value)} required
                  inputMode="decimal" placeholder="0,00"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Método</label>
                <div className="grid grid-cols-3 gap-2">
                  {["PIX", "Dinheiro", "Cartão"].map(m => (
                    <button key={m} type="button" onClick={() => setMetodo(m)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${metodo === m ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalLancamento(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvando ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — fechar caixa */}
      {modalFechar && (() => {
        // Agrupa por método para o tipo selecionado
        function breakdownPorMetodo(tipo: string) {
          const items = lancamentos.filter(l => l.tipo === tipo)
          const grupos: Record<string, { valor: number; count: number; items: Lancamento[] }> = {}
          for (const l of items) {
            const key = metodoLabel(l.method) || "Sem método"
            if (!grupos[key]) grupos[key] = { valor: 0, count: 0, items: [] }
            grupos[key].valor += l.valor
            grupos[key].count++
            grupos[key].items.push(l)
          }
          return Object.entries(grupos).sort((a, b) => b[1].valor - a[1].valor)
        }

        const linhas = [
          { tipo: "RECEITA", label: "Receitas", cor: "text-green-400", total: receitas },
          { tipo: "DESPESA", label: "Despesas", cor: "text-red-400", total: despesas },
          { tipo: "SANGRIA", label: "Sangrias", cor: "text-amber-400", total: sangrias },
        ]

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                {detalheTipo ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDetalheTipo(null)} className="text-zinc-500 hover:text-white transition-colors text-sm">← Voltar</button>
                    <h2 className="text-white font-bold">
                      {detalheTipo === "SALDO" ? "Saldo esperado" : linhas.find(l => l.tipo === detalheTipo)?.label}
                    </h2>
                  </div>
                ) : (
                  <h2 className="text-white font-bold">Fechar Caixa</h2>
                )}
                <button onClick={() => { setModalFechar(false); setDetalheTipo(null) }} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>

              {detalheTipo ? (
                /* Visão analítica */
                <div className="p-5 space-y-3">
                  <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Por método de pagamento</div>

                  {detalheTipo === "SALDO" ? (
                    /* Saldo: agrupa todos os lançamentos por método (sem histórico) */
                    (() => {
                      const grupos: Record<string, number> = {}
                      for (const l of lancamentos) {
                        const key = metodoLabel(l.method) || "Sem método"
                        const sinal = l.tipo === "RECEITA" ? 1 : -1
                        grupos[key] = (grupos[key] ?? 0) + l.valor * sinal
                      }
                      return Object.entries(grupos)
                        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                        .map(([nome, val]) => (
                          <div key={nome} className="bg-zinc-800 rounded-xl flex items-center justify-between px-4 py-3">
                            <span className="text-white text-sm font-medium">{nome}</span>
                            <span className={`font-bold font-mono text-sm ${val >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {val >= 0 ? "+" : "−"} {fmtMoeda(Math.abs(val))}
                            </span>
                          </div>
                        ))
                    })()
                  ) : (
                    /* Receita/Despesa/Sangria: agrupa com histórico */
                    <>
                      {breakdownPorMetodo(detalheTipo).map(([metodoNome, dados]) => (
                        <div key={metodoNome} className="bg-zinc-800 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-medium">{metodoNome}</span>
                              <span className="text-zinc-600 text-xs">{dados.count} lançamento{dados.count !== 1 ? "s" : ""}</span>
                            </div>
                            <span className={`font-bold font-mono text-sm ${linhas.find(l => l.tipo === detalheTipo)?.cor ?? "text-white"}`}>
                              {fmtMoeda(dados.valor)}
                            </span>
                          </div>
                          {dados.items.map(item => (
                            <div key={item.id} className="flex justify-between px-4 py-1.5 border-t border-zinc-700/60">
                              <span className="text-zinc-400 text-xs truncate max-w-[200px]">{item.descricao}</span>
                              <span className="text-zinc-300 text-xs font-mono flex-shrink-0 ml-2">R$ {item.valor.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {breakdownPorMetodo(detalheTipo).length === 0 && (
                        <div className="text-zinc-600 text-sm text-center py-4">Nenhum lançamento</div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Visão sintética + fechamento */
                <form onSubmit={handleFecharCaixa} className="p-5 space-y-4">
                  <div className="bg-zinc-800 rounded-xl overflow-hidden">
                    {linhas.map(({ tipo: t, label, cor, total }) => (
                      <button key={t} type="button"
                        onClick={() => setDetalheTipo(t)}
                        className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-700 last:border-0 hover:bg-zinc-700/50 transition-colors group">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-sm group-hover:text-zinc-200 transition-colors">{label}</span>
                          <span className="text-zinc-600 text-xs group-hover:text-zinc-400 transition-colors">ver detalhes →</span>
                        </div>
                        <span className={`font-mono font-bold text-sm ${cor}`}>{fmtMoeda(total)}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => setDetalheTipo("SALDO")}
                      className="w-full flex items-center justify-between px-4 py-3 bg-zinc-700/30 hover:bg-zinc-700/50 transition-colors group">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-bold">Saldo esperado</span>
                        <span className="text-zinc-500 text-xs group-hover:text-zinc-400 transition-colors">ver detalhes →</span>
                      </div>
                      <span className="text-white font-mono font-bold">{fmtMoeda(saldo)}</span>
                    </button>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Valor em caixa (contagem física)</label>
                    <input value={valorFechamento} onChange={e => setValorFechamento(e.target.value)}
                      inputMode="decimal" placeholder={saldo.toFixed(2)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                    {valorFechamento && !isNaN(parseFloat(valorFechamento)) && (
                      <div className={`text-xs mt-1 ${Math.abs(parseFloat(valorFechamento) - saldo) < 0.01 ? "text-green-400" : "text-amber-400"}`}>
                        {parseFloat(valorFechamento) >= saldo
                          ? `Sobra: ${fmtMoeda(parseFloat(valorFechamento) - saldo)}`
                          : `Falta: ${fmtMoeda(saldo - parseFloat(valorFechamento))}`
                        }
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setModalFechar(false)}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={salvando}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-red-500/20 transition-colors">
                      {salvando ? "Fechando..." : "Fechar caixa"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )
      })()}

    </DashboardLayout>
  )
}
