"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const lancamentosMock = [
  { id: "1", tipo: "RECEITA", descricao: "Corte + Barba — Felipe Gomes", valor: 95, metodo: "PIX", hora: "09:15" },
  { id: "2", tipo: "RECEITA", descricao: "Corte — Pedro Silva", valor: 65, metodo: "PIX", hora: "10:30" },
  { id: "3", tipo: "RECEITA", descricao: "Progressiva — Carla Dias", valor: 180, metodo: "Dinheiro", hora: "11:45" },
  { id: "4", tipo: "DESPESA", descricao: "Compra de produtos — Distribarbearia", valor: 250, metodo: "PIX", hora: "12:00" },
  { id: "5", tipo: "RECEITA", descricao: "Barba — João Ribeiro", valor: 45, metodo: "PIX", hora: "14:20" },
  { id: "6", tipo: "RECEITA", descricao: "Corte VIP — Carlos Souza", valor: 95, metodo: "Cartão", hora: "15:10" },
  { id: "7", tipo: "SANGRIA", descricao: "Retirada para troco", valor: 100, metodo: "Dinheiro", hora: "16:00" },
]

const tipoStyle: Record<string, string> = {
  RECEITA: "text-green-400",
  DESPESA: "text-red-400",
  SANGRIA: "text-amber-400",
}

const tipoSinal: Record<string, string> = {
  RECEITA: "+",
  DESPESA: "-",
  SANGRIA: "-",
}

const metodoBadge: Record<string, string> = {
  PIX: "bg-green-500/10 text-green-400 border border-green-500/20",
  Dinheiro: "bg-zinc-700 text-zinc-300 border border-zinc-600",
  Cartão: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
}

export default function CaixaPage() {
  const [caixaAberto, setCaixaAberto] = useState(true)
  const [modalLancamento, setModalLancamento] = useState(false)
  const [tipo, setTipo] = useState("RECEITA")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [metodo, setMetodo] = useState("PIX")

  const totalReceitas = lancamentosMock.filter(l => l.tipo === "RECEITA").reduce((s, l) => s + l.valor, 0)
  const totalDespesas = lancamentosMock.filter(l => l.tipo === "DESPESA").reduce((s, l) => s + l.valor, 0)
  const totalSangria = lancamentosMock.filter(l => l.tipo === "SANGRIA").reduce((s, l) => s + l.valor, 0)
  const saldoAtual = totalReceitas - totalDespesas - totalSangria

  function handleLancamento(e: React.FormEvent) {
    e.preventDefault()
    setModalLancamento(false)
    setDescricao("")
    setValor("")
    setTipo("RECEITA")
    setMetodo("PIX")
  }

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Controle de Caixa</h1>
          <p className="text-zinc-500 text-sm">Domingo, 05 de Abril de 2026 · Aberto às 08:00</p>
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
              onClick={() => setCaixaAberto(false)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm border border-red-500/20 transition-colors"
            >
              Fechar caixa
            </button>
          ) : (
            <button
              onClick={() => setCaixaAberto(true)}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm border border-green-500/20 transition-colors"
            >
              Abrir caixa
            </button>
          )}
        </div>
      </div>

      {/* Status do caixa */}
      <div className={`rounded-xl p-4 mb-4 border ${caixaAberto ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${caixaAberto ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className={`text-sm font-medium ${caixaAberto ? "text-green-400" : "text-red-400"}`}>
              Caixa {caixaAberto ? "Aberto" : "Fechado"}
            </span>
          </div>
          <div className="text-right">
            <div className="text-zinc-500 text-xs">Saldo atual</div>
            <div className="text-white text-2xl font-bold">R$ {saldoAtual.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Receitas</div>
          <div className="text-green-400 text-xl font-bold">R$ {totalReceitas.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Despesas</div>
          <div className="text-red-400 text-xl font-bold">R$ {totalDespesas.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Sangrias</div>
          <div className="text-amber-400 text-xl font-bold">R$ {totalSangria.toFixed(2)}</div>
        </div>
      </div>

      {/* Lançamentos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Lançamentos do dia</span>
          <span className="text-zinc-600 text-xs">{lancamentosMock.length} registros</span>
        </div>
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
            {lancamentosMock.map((l, i) => (
              <tr key={l.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors ${i === lancamentosMock.length - 1 ? "border-0" : ""}`}>
                <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{l.hora}</td>
                <td className="px-4 py-3 text-zinc-300 text-sm">{l.descricao}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${metodoBadge[l.metodo] ?? "bg-zinc-700 text-zinc-400"}`}>
                    {l.metodo}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-bold font-mono ${tipoStyle[l.tipo]}`}>
                  {tipoSinal[l.tipo]}R$ {l.valor.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal lançamento */}
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
                  {["RECEITA", "DESPESA", "SANGRIA"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                        tipo === t
                          ? t === "RECEITA" ? "bg-green-500/15 text-green-400 border-green-500/30"
                          : t === "DESPESA" ? "bg-red-500/15 text-red-400 border-red-500/30"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      {t === "RECEITA" ? "Receita" : t === "DESPESA" ? "Despesa" : "Sangria"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Descrição *</label>
                <input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                  placeholder="Ex: Corte + Barba — João Silva"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Valor (R$) *</label>
                <input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 95.00"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Método de pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {["PIX", "Dinheiro", "Cartão"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodo(m)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                        metodo === m
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalLancamento(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}