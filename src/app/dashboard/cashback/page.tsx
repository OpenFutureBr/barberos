"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const configCashback = [
  { id: "1", servico: "Corte de Cabelo", percentual: 5 },
  { id: "2", servico: "Corte + Barba", percentual: 7 },
  { id: "3", servico: "Barba Completa", percentual: 5 },
  { id: "4", servico: "Progressiva / Escova", percentual: 8 },
  { id: "5", servico: "Pacote VIP", percentual: 10 },
  { id: "6", servico: "Domicílio (qualquer)", percentual: 5 },
]

const transacoesMock = [
  { id: "1", cliente: "Felipe Gomes", tipo: "EARNED", valor: 6.65, descricao: "Corte + Barba · 7%", hora: "14:32" },
  { id: "2", cliente: "Pedro Silva", tipo: "EARNED", valor: 3.25, descricao: "Corte de Cabelo · 5%", hora: "13:15" },
  { id: "3", cliente: "Felipe Gomes", tipo: "REDEEMED", valor: 20.00, descricao: "Resgate no atendimento", hora: "12:00" },
  { id: "4", cliente: "Bruno Melo", tipo: "EARNED", valor: 2.25, descricao: "Barba Completa · 5%", hora: "11:30" },
  { id: "5", cliente: "Carlos Souza", tipo: "REDEEMED", valor: 15.00, descricao: "Resgate no atendimento", hora: "10:45" },
]

const rankingMock = [
  { id: "1", nome: "Felipe Gomes", saldo: 47, totalGanho: 132, totalResgatado: 85, nivel: "VIP" },
  { id: "2", nome: "Pedro Silva", saldo: 31, totalGanho: 56, totalResgatado: 25, nivel: "Gold" },
  { id: "3", nome: "André Nogueira", saldo: 19, totalGanho: 31, totalResgatado: 12, nivel: "Silver" },
  { id: "4", nome: "João Ribeiro", saldo: 12, totalGanho: 12, totalResgatado: 0, nivel: "Bronze" },
  { id: "5", nome: "Bruno Melo", saldo: 8, totalGanho: 8, totalResgatado: 0, nivel: "Bronze" },
]

const nivelStyle: Record<string, string> = {
  VIP: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Gold: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  Silver: "bg-zinc-400/10 text-zinc-300 border border-zinc-400/20",
  Bronze: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
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

export default function CashbackPage() {
  const [aba, setAba] = useState<"config" | "ranking" | "historico">("config")
  const [percentuais, setPercentuais] = useState(configCashback)

  const totalDistribuido = 1240
  const totalResgatado = 485
  const saldoAtivo = rankingMock.reduce((s, c) => s + c.saldo, 0)

  function updatePercentual(id: string, valor: number) {
    setPercentuais(prev => prev.map(p => p.id === id ? { ...p, percentual: valor } : p))
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Cashback & Fidelidade</h1>
          <p className="text-zinc-500 text-sm">MOD-06 · Programa automático por serviço</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-1">Total distribuído</div>
          <div className="text-amber-400 text-2xl font-bold">R$ {totalDistribuido}</div>
          <div className="text-zinc-500 text-xs mt-1">este mês · 4,4% do faturamento</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Total resgatado</div>
          <div className="text-green-400 text-2xl font-bold">R$ {totalResgatado}</div>
          <div className="text-zinc-600 text-xs mt-1">89 resgates este mês</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Saldo ativo</div>
          <div className="text-blue-400 text-2xl font-bold">R$ {saldoAtivo}</div>
          <div className="text-zinc-600 text-xs mt-1">em carteiras dos clientes</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "config", label: "⚙ Configuração" },
          { id: "ranking", label: "🏆 Ranking" },
          { id: "historico", label: "📋 Histórico" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aba Configuração */}
      {aba === "config" && (
        <div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-3">
            <div className="px-4 py-3 border-b border-zinc-800">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Percentual de cashback por serviço</div>
              <div className="text-zinc-600 text-xs mt-0.5">Gerado automaticamente após cada pagamento PIX confirmado</div>
            </div>
            <div className="divide-y divide-zinc-800">
              {percentuais.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 text-white text-sm">{item.servico}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={item.percentual}
                      onChange={(e) => updatePercentual(item.id, parseInt(e.target.value))}
                      className="w-24 accent-amber-500"
                    />
                    <div className="w-10 text-right">
                      <span className="text-amber-400 font-bold text-sm">{item.percentual}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-400 text-base">✓</span>
            <div>
              <div className="text-green-400 text-sm font-medium">Cashback automático ativo</div>
              <div className="text-zinc-500 text-xs mt-0.5">O sistema calcula e credita o cashback automaticamente após cada PIX confirmado. Nenhuma ação manual necessária.</div>
            </div>
          </div>
        </div>
      )}

      {/* Aba Ranking */}
      {aba === "ranking" && (
        <div className="space-y-2">
          {rankingMock.map((cliente, i) => (
            <div key={cliente.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
              <div className={`text-lg font-bold font-mono w-6 ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-600"}`}>
                {i + 1}
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {cliente.nome.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-medium">{cliente.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${nivelStyle[cliente.nivel]}`}>
                    {cliente.nivel}
                  </span>
                </div>
                <div className="text-zinc-500 text-xs">
                  Ganhou R$ {cliente.totalGanho} · Resgatou R$ {cliente.totalResgatado}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-amber-400 font-bold text-lg">R$ {cliente.saldo}</div>
                <div className="text-zinc-600 text-xs">saldo atual</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aba Histórico */}
      {aba === "historico" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Descrição</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Hora</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transacoesMock.map((t, i) => (
                <tr key={t.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === transacoesMock.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 text-white text-sm font-medium">{t.cliente}</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{t.descricao}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{t.hora}</td>
                  <td className={`px-4 py-3 text-right font-bold font-mono ${tipoStyle[t.tipo]}`}>
                    {tipoLabel[t.tipo]} R$ {t.valor.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </DashboardLayout>
  )
}