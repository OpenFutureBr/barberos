"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Fatura = {
  id: string
  organizacaoId: string
  organizacaoNome: string
  organizacaoCnpj: string | null
  status: string
  amount: number
  dueDate: string
  paidAt: string | null
  referenceMonth: string
  notes: string | null
  vencida: boolean
}

type DadosFaturamento = {
  mrr: number
  arr: number
  ativos: number
  trial: number
  totalPendente: number
  totalVencido: number
  totalRecebido: number
  faturas: Fatura[]
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  PAID:    { label: "Pago",     cls: "bg-green-500/10 text-green-400 border-green-500/20" },
  OVERDUE: { label: "Vencida",  cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  CANCELLED: { label: "Cancelada", cls: "bg-zinc-700 text-zinc-400 border-zinc-600" },
  REFUNDED:  { label: "Reembolsada", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtData(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR")
}

export default function AdminFaturamentoPage() {
  const [dados, setDados] = useState<DadosFaturamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<"todas" | "pendentes" | "vencidas" | "pagas">("todas")
  const [acao, setAcao] = useState<string | null>(null)
  const [criandoFatura, setCriandoFatura] = useState(false)

  // Form nova fatura
  const [modalNova, setModalNova] = useState(false)
  const [processando, setProcessando] = useState(false)

  async function processarCobrancas() {
    if (!confirm("Processar inadimplência agora?\n\nIsso irá:\n• Marcar faturas vencidas como OVERDUE\n• Atualizar status das organizações\n• Suspender empresas com +7 dias de atraso")) return
    setProcessando(true)
    const res = await fetch("/api/admin/cobranca", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    const d = await res.json()
    alert(`Processado:\n• ${d.faturasVencidas} faturas vencidas\n• ${d.orgsAtualizadasOverdue} org. em atraso\n• ${d.orgsSuspensas} org. suspensas\n• ${d.orgsReativadas} org. reativadas`)
    setProcessando(false)
    buscar()
  }
  const [fOrg, setFOrg] = useState("")
  const [fValor, setFValor] = useState("")
  const [fVencimento, setFVencimento] = useState("")
  const [fMesRef, setFMesRef] = useState(new Date().toISOString().slice(0, 7))
  const [fNota, setFNota] = useState("")
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([])

  useEffect(() => { buscar() }, [])
  useEffect(() => {
    fetch("/api/admin/empresas").then(r => r.json()).then(d => {
      if (Array.isArray(d?.empresas)) setOrgs(d.empresas.map((e: any) => ({ id: e.id, name: e.name })))
    }).catch(() => {})
  }, [])

  async function buscar() {
    setLoading(true)
    const res = await fetch("/api/admin/faturamento")
    const d = await res.json()
    if (!d.error) setDados(d)
    setLoading(false)
  }

  async function marcarPaga(id: string) {
    if (!confirm("Marcar esta fatura como paga?")) return
    setAcao(id)
    await fetch(`/api/admin/empresas/${faturaById(id)?.organizacaoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-invoice-paid", invoiceId: id }),
    })
    setAcao(null)
    buscar()
  }

  async function criarFatura(e: React.FormEvent) {
    e.preventDefault()
    setCriandoFatura(true)
    await fetch(`/api/admin/empresas/${fOrg}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-invoice",
        amount: Number(fValor),
        dueDate: fVencimento,
        referenceMonth: fMesRef,
        notes: fNota || null,
      }),
    })
    setCriandoFatura(false)
    setModalNova(false)
    setFOrg(""); setFValor(""); setFVencimento(""); setFNota("")
    buscar()
  }

  function faturaById(id: string) {
    return dados?.faturas.find(f => f.id === id)
  }

  const faturas = dados?.faturas ?? []
  const filtradas = filtro === "todas" ? faturas
    : filtro === "pendentes" ? faturas.filter(f => f.status === "PENDING" && !f.vencida)
    : filtro === "vencidas"  ? faturas.filter(f => f.vencida || f.status === "OVERDUE")
    : faturas.filter(f => f.status === "PAID")

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Faturamento</h1>
            <p className="text-zinc-500 text-sm mt-1">Assinaturas, cobranças e inadimplência.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={processarCobrancas} disabled={processando}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-200 font-medium px-4 py-2 rounded-lg text-sm border border-zinc-600 transition-colors">
              {processando ? "Processando..." : "⚡ Processar cobranças"}
            </button>
            <button onClick={() => setModalNova(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-lg text-sm">
              + Nova fatura
            </button>
            <Link href="/admin" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700">
              ← Voltar
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "MRR", value: dados ? fmtMoeda(dados.mrr) : "—", color: "text-amber-400" },
            { label: "ARR", value: dados ? fmtMoeda(dados.arr) : "—", color: "text-white" },
            { label: "Assinaturas ativas", value: dados ? String(dados.ativos) : "—", color: "text-green-400" },
            { label: "Em trial", value: dados ? String(dados.trial) : "—", color: "text-blue-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "A receber", value: dados ? fmtMoeda(dados.totalPendente) : "—", color: "text-amber-400" },
            { label: "Vencido",   value: dados ? fmtMoeda(dados.totalVencido) : "—",  color: "text-red-400" },
            { label: "Recebido (total)", value: dados ? fmtMoeda(dados.totalRecebido) : "—", color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filtros + tabela */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-1 p-4 border-b border-zinc-800">
            {(["todas", "pendentes", "vencidas", "pagas"] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filtro === f ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {f === "todas" ? `Todas (${faturas.length})`
                  : f === "pendentes" ? `Pendentes (${faturas.filter(x => x.status === "PENDING" && !x.vencida).length})`
                  : f === "vencidas"  ? `Vencidas (${faturas.filter(x => x.vencida || x.status === "OVERDUE").length})`
                  : `Pagas (${faturas.filter(x => x.status === "PAID").length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
          ) : filtradas.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-sm">Nenhuma fatura encontrada</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Empresa</th>
                  <th className="text-left px-4 py-3">Referência</th>
                  <th className="text-left px-4 py-3">Vencimento</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((f, i) => {
                  const st = f.vencida && f.status === "PENDING"
                    ? STATUS_LABEL["OVERDUE"]
                    : STATUS_LABEL[f.status] ?? STATUS_LABEL["PENDING"]
                  return (
                    <tr key={f.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === filtradas.length - 1 ? "border-0" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{f.organizacaoNome}</div>
                        {f.organizacaoCnpj && <div className="text-zinc-600 text-xs font-mono">{f.organizacaoCnpj}</div>}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{f.referenceMonth}</td>
                      <td className="px-4 py-3 text-zinc-400">{fmtData(f.dueDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                        {f.paidAt && <div className="text-zinc-600 text-xs mt-0.5">Pago em {fmtData(f.paidAt)}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-white">{fmtMoeda(f.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        {(f.status === "PENDING") && (
                          <button onClick={() => marcarPaga(f.id)} disabled={acao === f.id}
                            className="bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/20 rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50">
                            {acao === f.id ? "..." : "Marcar pago"}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal nova fatura */}
      {modalNova && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Nova Fatura</h2>
              <button onClick={() => setModalNova(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={criarFatura} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Empresa *</label>
                <select value={fOrg} onChange={e => setFOrg(e.target.value)} required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500">
                  <option value="">— selecione —</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Valor (R$) *</label>
                  <input value={fValor} onChange={e => setFValor(e.target.value)} required type="number" min="0" step="0.01" placeholder="99.00"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Mês de referência *</label>
                  <input value={fMesRef} onChange={e => setFMesRef(e.target.value)} required type="month"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500" />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Vencimento *</label>
                <input value={fVencimento} onChange={e => setFVencimento(e.target.value)} required type="date"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Observação</label>
                <input value={fNota} onChange={e => setFNota(e.target.value)} placeholder="Ex: Mensalidade Junho"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalNova(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={criandoFatura}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {criandoFatura ? "Criando..." : "Criar fatura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
