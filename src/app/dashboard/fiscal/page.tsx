"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { fetchJsonSafe } from "@/lib/safe-fetch"

type NotaPendente = {
  id: string
  cliente: string
  servico: string
  valor: number
  metodo: string | null
  status: "PENDENTE"
  finalizadoEm: string | null
}

type RepasseMEI = {
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

const statusStyle: Record<string, string> = {
  EMITIDA: "bg-green-500/10 text-green-400 border border-green-500/20",
  PENDENTE: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  CANCELADA: "bg-red-500/10 text-red-400 border border-red-500/20",
  REJEITADA: "bg-red-500/10 text-red-400 border border-red-500/20",
}

const MESES_NOME = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export default function FiscalPage() {
  const [aba, setAba] = useState<"nfe" | "mei">("nfe")
  const [modalEmitir, setModalEmitir] = useState(false)
  const [cliente, setCliente] = useState("")
  const [servico, setServico] = useState("")
  const [valor, setValor] = useState("")

  const [notas, setNotas] = useState<NotaPendente[]>([])
  const [repassesMEI, setRepassesMEI] = useState<RepasseMEI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hoje = new Date()
    setLoading(true)

    Promise.all([
      fetchJsonSafe<NotaPendente[]>("/api/fiscal/notas", "fiscal:notas:hoje"),
      fetchJsonSafe<RepasseMEI[]>(
        `/api/financeiro/repasses?mes=${hoje.getMonth() + 1}&ano=${hoje.getFullYear()}`,
        `financeiro:repasses:${hoje.getFullYear()}-${hoje.getMonth() + 1}`,
      ),
    ]).then(([notasData, repassesData]) => {
      if (notasData) setNotas(notasData)
      if (repassesData) setRepassesMEI(repassesData.filter((r) => r.tipo === "MEI"))
    }).finally(() => setLoading(false))
  }, [])

  const totalPendente = notas.reduce((s, n) => s + n.valor, 0)
  const pendentes = notas.length
  const periodoAtual = `${MESES_NOME[new Date().getMonth()]} ${new Date().getFullYear()}`

  function handleEmitir(e: React.FormEvent) {
    e.preventDefault()
    setModalEmitir(false)
    setCliente("")
    setServico("")
    setValor("")
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Fiscal & NF-e</h1>
          <p className="text-zinc-500 text-sm">Emissão de nota fiscal · Relatório MEI · Compliance tributário</p>
        </div>
        <button
          onClick={() => setModalEmitir(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Emitir NF-e
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-green-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">NF-e emitidas hoje</div>
          <div className="text-green-400 text-2xl font-bold">0</div>
          <div className="text-zinc-600 text-xs mt-1">emissão real ainda não conectada</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-amber-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Pendentes</div>
          <div className="text-amber-400 text-2xl font-bold">{loading ? "…" : pendentes}</div>
          <div className="text-zinc-600 text-xs mt-1">R$ {totalPendente.toFixed(2)} aguardando emissão</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-blue-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Relatórios MEI</div>
          <div className="text-blue-400 text-2xl font-bold">{loading ? "…" : repassesMEI.length}</div>
          <div className="text-zinc-600 text-xs mt-1">profissionais com relatório pronto</div>
        </div>
      </div>

      {/* Aviso compliance */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-4 flex items-start gap-3">
        <span className="text-blue-400 text-base flex-shrink-0">⚖️</span>
        <div>
          <div className="text-blue-400 text-sm font-medium">Compliance — Lei do Salão Parceiro</div>
          <div className="text-zinc-500 text-xs mt-0.5">O BarberOS gera relatórios para que profissionais MEI emitam NF no próprio CNPJ. O sistema não emite NF em nome do MEI — apenas facilita o processo. A emissão automática de NF-e ainda não está integrada a nenhum provedor.</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "nfe", label: "📄 Atendimentos a faturar" },
          { id: "mei", label: "🪪 Relatório MEI" },
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

      {/* Aba NF-e — atendimentos concluídos hoje, reais, aguardando emissão */}
      {aba === "nfe" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Serviço</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Concluído</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-sm">Carregando...</td></tr>
              ) : notas.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-sm">Nenhum atendimento concluído hoje</td></tr>
              ) : notas.map((nota, i) => (
                <tr key={nota.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors ${i === notas.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 text-white text-sm font-medium">{nota.cliente}</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{nota.servico}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs font-mono">
                    {nota.finalizadoEm ? new Date(nota.finalizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">R$ {nota.valor.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[nota.status]}`}>
                      {nota.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba MEI — repasse real do mês atual, filtrado a profissionais MEI */}
      {aba === "mei" && (
        <div className="space-y-3">
          {loading ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-600 text-sm">Carregando...</div>
          ) : repassesMEI.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-600 text-sm">Nenhum profissional MEI com atendimentos em {periodoAtual}</div>
          ) : repassesMEI.map((rel) => {
            const bancada = !rel.commissionPct && !rel.benchFeePct && rel.benchFee ? rel.benchFee : 0
            const liquido = rel.repasse - bancada
            return (
              <div key={rel.profissionalId} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-bold">{rel.nome}</div>
                    <div className="text-zinc-500 text-sm">{periodoAtual} · {rel.atendimentos} atendimentos</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    Disponível
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Faturamento bruto</div>
                    <div className="text-white font-bold">R$ {rel.bruto.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Taxa de bancada</div>
                    <div className="text-red-400 font-bold">- R$ {bancada.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Líquido para NF</div>
                    <div className="text-green-400 font-bold">R$ {liquido.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal emitir NF-e */}
      {modalEmitir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Emitir NF-e</h2>
              <button onClick={() => setModalEmitir(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleEmitir} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Cliente *</label>
                <input value={cliente} onChange={(e) => setCliente(e.target.value)} required placeholder="Nome do cliente" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Serviço prestado *</label>
                <input value={servico} onChange={(e) => setServico(e.target.value)} required placeholder="Ex: Corte + Barba" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Valor (R$) *</label>
                <input value={valor} onChange={(e) => setValor(e.target.value)} required type="number" placeholder="95.00" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-zinc-400">
                ⚠ A emissão real de NF-e ainda não está integrada a nenhum provedor. Esta tela só organiza os dados — nada é enviado.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalEmitir(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">Fechar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}
