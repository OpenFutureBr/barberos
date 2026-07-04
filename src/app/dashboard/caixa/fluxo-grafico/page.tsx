"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { fetchJsonSafe } from "@/lib/safe-fetch"

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDataISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Visão máxima permitida: M-3 em relação à data atual
function limiteMinimoFluxo() {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return fmtDataISO(d)
}

function periodoPadrao() {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - 30)
  return { from: fmtDataISO(inicio), to: fmtDataISO(hoje) }
}

type FluxoDia = {
  data: string
  totalEntradas: number
  totalSaidas: number
  receitaProjetada: number
}

type FluxoResp = {
  days: FluxoDia[]
  totalEntradas: number
  totalSaidas: number
  totalProjetado: number
  saldoFinal: number
}

type Granularidade = "diaria" | "semanal" | "mensal"
type Bucket = { chave: string; label: string; entradas: number; saidas: number; projetado: number }

function chaveSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  const diaSemana = (d.getDay() + 6) % 7 // 0 = segunda-feira
  const seg = new Date(d)
  seg.setDate(d.getDate() - diaSemana)
  return fmtDataISO(seg)
}

function chaveMes(iso: string) {
  return iso.slice(0, 7) // YYYY-MM
}

function agrupar(days: FluxoDia[], granularidade: Granularidade): Bucket[] {
  if (granularidade === "diaria") {
    return days.map(d => ({
      chave: d.data,
      label: new Date(`${d.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      entradas: d.totalEntradas,
      saidas: d.totalSaidas,
      projetado: d.receitaProjetada,
    }))
  }

  const chave = granularidade === "semanal" ? chaveSemana : chaveMes
  const map = new Map<string, Bucket>()

  for (const d of days) {
    const k = chave(d.data)
    if (!map.has(k)) {
      const label = granularidade === "semanal"
        ? `Sem ${new Date(`${k}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
        : new Date(`${k}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      map.set(k, { chave: k, label, entradas: 0, saidas: 0, projetado: 0 })
    }
    const b = map.get(k)!
    b.entradas += d.totalEntradas
    b.saidas += d.totalSaidas
    b.projetado += d.receitaProjetada
  }

  return Array.from(map.values()).sort((a, b) => a.chave.localeCompare(b.chave))
}

function FluxoGraficoContent() {
  const searchParams = useSearchParams()
  const padrao = useMemo(() => periodoPadrao(), [])
  const limiteMin = useMemo(() => limiteMinimoFluxo(), [])

  const [from, setFrom] = useState(() => {
    const v = searchParams.get("from")
    return v && v >= limiteMin ? v : padrao.from
  })
  const [to, setTo] = useState(() => searchParams.get("to") ?? padrao.to)
  const [granularidade, setGranularidade] = useState<Granularidade>("diaria")
  const [dados, setDados] = useState<FluxoResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchJsonSafe<FluxoResp>(`/api/financeiro/fluxo?from=${from}&to=${to}`, `financeiro:fluxo:${from}:${to}`)
      .then(d => { if (d) setDados(d) })
      .finally(() => setLoading(false))
  }, [from, to])

  const buckets = useMemo(() => agrupar(dados?.days ?? [], granularidade), [dados, granularidade])
  const maxValor = Math.max(...buckets.map(b => Math.max(b.entradas, b.saidas, b.projetado)), 1)

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold">Gráfico — Fluxo de Caixa</h1>
          <p className="text-zinc-500 text-sm">
            {new Date(`${from}T12:00:00`).toLocaleDateString("pt-BR")} até {new Date(`${to}T12:00:00`).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 text-xs">De</span>
          <input
            type="date"
            value={from}
            min={limiteMin}
            max={to}
            onChange={(e) => setFrom(e.target.value < limiteMin ? limiteMin : e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
          <span className="text-zinc-500 text-xs">até</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">Entradas</div>
          {loading ? <div className="h-7 bg-green-500/10 rounded animate-pulse" /> : <div className="text-green-400 text-xl font-bold">{fmtMoeda(dados?.totalEntradas ?? 0)}</div>}
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="text-red-400 text-xs font-mono uppercase tracking-widest mb-1">Saídas</div>
          {loading ? <div className="h-7 bg-red-500/10 rounded animate-pulse" /> : <div className="text-red-400 text-xl font-bold">{fmtMoeda(dados?.totalSaidas ?? 0)}</div>}
        </div>
        <div className={`border rounded-xl p-4 ${(dados?.saldoFinal ?? 0) >= 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20"}`}>
          <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${(dados?.saldoFinal ?? 0) >= 0 ? "text-amber-400" : "text-red-400"}`}>Saldo</div>
          {loading ? <div className="h-7 bg-amber-500/10 rounded animate-pulse" /> : <div className={`text-xl font-bold ${(dados?.saldoFinal ?? 0) >= 0 ? "text-amber-400" : "text-red-400"}`}>{fmtMoeda(dados?.saldoFinal ?? 0)}</div>}
        </div>
        <div className="bg-purple-500/5 border border-dashed border-purple-500/30 rounded-xl p-4">
          <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-1">Projeção de receita</div>
          {loading ? <div className="h-7 bg-purple-500/10 rounded animate-pulse" /> : <div className="text-purple-400 text-xl font-bold">{fmtMoeda(dados?.totalProjetado ?? 0)}</div>}
          <div className="text-purple-600/60 text-xs mt-1">pendentes + agendamentos futuros</div>
        </div>
      </div>

      {/* Filtro próprio do gráfico: granularidade */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
            Entradas × Saídas × Projeção
          </span>
          <div className="flex gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
            {([
              { key: "diaria", label: "Diária" },
              { key: "semanal", label: "Semanal" },
              { key: "mensal", label: "Mensal" },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => setGranularidade(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  granularidade === opt.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-64 bg-zinc-800 rounded animate-pulse" />
        ) : buckets.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">Sem dados no período</div>
        ) : (
          <>
            <div className="flex items-end gap-3 h-64 overflow-x-auto pb-2">
              {buckets.map((b) => (
                <div key={b.chave} className="flex-shrink-0 flex flex-col items-center gap-1" style={{ minWidth: 56 }}>
                  <div className="flex items-end gap-0.5" style={{ height: 200 }}>
                    <div
                      className="w-3 rounded-t bg-green-500/70 hover:bg-green-500 transition-all"
                      style={{ height: `${Math.max(2, (b.entradas / maxValor) * 100)}%` }}
                      title={`Entradas: ${fmtMoeda(b.entradas)}`}
                    />
                    <div
                      className="w-3 rounded-t bg-red-500/70 hover:bg-red-500 transition-all"
                      style={{ height: `${Math.max(2, (b.saidas / maxValor) * 100)}%` }}
                      title={`Saídas: ${fmtMoeda(b.saidas)}`}
                    />
                    <div
                      className="w-3 rounded-t bg-purple-500/50 border border-dashed border-purple-400/60 hover:bg-purple-500/70 transition-all"
                      style={{ height: `${Math.max(2, (b.projetado / maxValor) * 100)}%` }}
                      title={`Projeção: ${fmtMoeda(b.projetado)}`}
                    />
                  </div>
                  <div className="text-zinc-600 text-[10px] font-mono whitespace-nowrap">{b.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-500/70" /><span className="text-zinc-500">Entradas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/70" /><span className="text-zinc-500">Saídas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500/50 border border-dashed border-purple-400/60" /><span className="text-zinc-500">Projeção</span></div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function FluxoGraficoPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="text-zinc-600 text-sm">Carregando...</div></DashboardLayout>}>
      <FluxoGraficoContent />
    </Suspense>
  )
}
