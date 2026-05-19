"use client"

import { useState, useEffect, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

type Lancamento = {
  id: string
  tipo: string
  descricao: string
  valor: number
  method: string | null
  createdAt: string
  origem: "pagamento" | "produto" | "manual"
  txId?: string
}

type Caixa = {
  id: string
  openedAt: string
  closedAt: string | null
  openingAmount: number
}

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

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

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
    fetch("/api/caixa")
      .then(r => r.json())
      .then(d => {
        setCaixa(d.caixa ?? null)
        setLancamentos(Array.isArray(d.lancamentos) ? d.lancamentos : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchDados() }, [fetchDados])

  // Recarrega quando um pagamento é confirmado
  useEffect(() => {
    window.addEventListener("pagamentoConfirmado", fetchDados)
    return () => window.removeEventListener("pagamentoConfirmado", fetchDados)
  }, [fetchDados])

  const receitas = lancamentos.filter(l => l.tipo === "RECEITA").reduce((s, l) => s + l.valor, 0)
  const despesas = lancamentos.filter(l => l.tipo === "DESPESA").reduce((s, l) => s + l.valor, 0)
  const sangrias = lancamentos.filter(l => l.tipo === "SANGRIA").reduce((s, l) => s + l.valor, 0)
  const saldo = receitas - despesas - sangrias

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

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Controle de Caixa</h1>
          <p className="text-zinc-500 text-sm capitalize">
            {hoje}
            {caixa && caixaAberto && ` · Aberto às ${fmtHora(caixa.openedAt)}`}
          </p>
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

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Receitas</div>
          {loading ? <div className="h-6 bg-zinc-800 rounded animate-pulse" /> : <div className="text-green-400 text-xl font-bold">{fmtMoeda(receitas)}</div>}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Despesas</div>
          {loading ? <div className="h-6 bg-zinc-800 rounded animate-pulse" /> : <div className="text-red-400 text-xl font-bold">{fmtMoeda(despesas)}</div>}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Sangrias</div>
          {loading ? <div className="h-6 bg-zinc-800 rounded animate-pulse" /> : <div className="text-amber-400 text-xl font-bold">{fmtMoeda(sangrias)}</div>}
        </div>
      </div>

      {/* Lançamentos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Lançamentos do dia</span>
          <span className="text-zinc-600 text-xs">{lancamentos.length} registros</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-zinc-600 text-sm">Carregando...</div>
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
              {lancamentos.map((l, i) => (
                <tr key={l.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors ${i === lancamentos.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{fmtHora(l.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-300 text-sm">{l.descricao}</div>
                    {l.origem !== "manual" && (
                      <div className="text-zinc-600 text-xs mt-0.5">{l.origem === "pagamento" ? "Pagamento confirmado" : "Venda de produto"}</div>
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
              ))}
            </tbody>
          </table>
        )}
      </div>

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
                    <h2 className="text-white font-bold">{linhas.find(l => l.tipo === detalheTipo)?.label}</h2>
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
                      {/* Detalhes individuais */}
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
                    <div className="flex justify-between px-4 py-3 bg-zinc-700/30">
                      <span className="text-white text-sm font-bold">Saldo esperado</span>
                      <span className="text-white font-mono font-bold">{fmtMoeda(saldo)}</span>
                    </div>
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
