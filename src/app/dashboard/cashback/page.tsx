"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"


const nivelStyle: Record<string, string> = {
  VIP: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  GOLD: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  SILVER: "bg-zinc-400/10 text-zinc-300 border border-zinc-400/20",
  BRONZE: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
}

const nivelLabel: Record<string, string> = {
  VIP: "VIP", GOLD: "Gold", SILVER: "Silver", BRONZE: "Bronze",
}

const tipoStyle: Record<string, string> = {
  EARNED: "text-green-400",
  REDEEMED: "text-amber-400",
  EXPIRED: "text-red-400",
}

const tipoLabel: Record<string, string> = {
  EARNED: "+ Ganhou",
  REDEEMED: "- Resgatou",
  EXPIRED: "- Expirou",
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

type RankingItem = {
  id: string; nome: string; saldo: number
  totalGanho: number; totalResgatado: number; nivel: string
}

type HistoricoItem = {
  id: string; cliente: string; tipo: string
  valor: number; descricao: string; createdAt: string
}

export default function CashbackPage() {
  const [aba, setAba] = useState<"ranking" | "historico">("ranking")
  const [loading, setLoading] = useState(true)

  const [saldoAtivo, setSaldoAtivo] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [totalRedeemed, setTotalRedeemed] = useState(0)
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [historico, setHistorico] = useState<HistoricoItem[]>([])

  useEffect(() => {
    fetch("/api/cashback")
      .then(r => r.json())
      .then(d => {
        if (d.error) return
        setSaldoAtivo(d.saldoAtivo ?? 0)
        setTotalEarned(d.totalEarned ?? 0)
        setTotalRedeemed(d.totalRedeemed ?? 0)
        setRanking(Array.isArray(d.ranking) ? d.ranking : [])
        setHistorico(Array.isArray(d.historico) ? d.historico : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function updatePercentual(id: string, valor: number) {
    setPercentuais(prev => prev.map(p => p.id === id ? { ...p, percentual: valor } : p))
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Cashback & Fidelidade</h1>
          <p className="text-zinc-500 text-sm">Programa automático por serviço</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-1">Total distribuído</div>
          {loading
            ? <div className="h-8 bg-amber-500/10 rounded animate-pulse" />
            : <div className="text-amber-400 text-2xl font-bold">{fmtMoeda(totalEarned)}</div>
          }
          <div className="text-zinc-500 text-xs mt-1">acumulado no programa</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total resgatado</div>
          {loading
            ? <div className="h-8 bg-zinc-800 rounded animate-pulse" />
            : <div className="text-green-400 text-2xl font-bold">{fmtMoeda(totalRedeemed)}</div>
          }
          <div className="text-zinc-600 text-xs mt-1">pelos clientes</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Saldo ativo</div>
          {loading
            ? <div className="h-8 bg-zinc-800 rounded animate-pulse" />
            : <div className="text-blue-400 text-2xl font-bold">{fmtMoeda(saldoAtivo)}</div>
          }
          <div className="text-zinc-600 text-xs mt-1">em carteiras dos clientes</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "ranking", label: "Ranking" },
          { id: "historico", label: "Histórico" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ranking */}
      {aba === "ranking" && (
        loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />)}
          </div>
        ) : ranking.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-600 text-sm">
            Nenhum cliente com cashback ainda
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((c, i) => (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
                <div className={`text-lg font-bold font-mono w-6 ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-600"}`}>
                  {i + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {c.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{c.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${nivelStyle[c.nivel] ?? nivelStyle.BRONZE}`}>
                      {nivelLabel[c.nivel] ?? c.nivel}
                    </span>
                  </div>
                  <div className="text-zinc-500 text-xs">
                    Ganhou {fmtMoeda(c.totalGanho)} · Resgatou {fmtMoeda(c.totalResgatado)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-amber-400 font-bold text-lg">{fmtMoeda(c.saldo)}</div>
                  <div className="text-zinc-600 text-xs">saldo atual</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Histórico */}
      {aba === "historico" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-600 text-sm">Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-sm">Nenhuma transação registrada</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Descrição</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Data</th>
                  <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((t, i) => (
                  <tr key={t.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === historico.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3 text-white text-sm font-medium">{t.cliente}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{t.descricao || tipoLabel[t.tipo] || t.tipo}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono">
                      {fmtData(t.createdAt)} {fmtHora(t.createdAt)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold font-mono ${tipoStyle[t.tipo] ?? "text-zinc-400"}`}>
                      {tipoLabel[t.tipo] ?? t.tipo} {fmtMoeda(t.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </DashboardLayout>
  )
}
