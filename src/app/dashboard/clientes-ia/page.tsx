"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

type ClienteIA = {
  id: string
  nome: string
  telefone: string
  segmento: string
  visitas: number
  ticket: number
  intervalo: number
  diasSemVisita: number
  risco: number
  cashback: number
  totalGasto: number
}

const segmentoConfig: Record<string, { label: string; style: string; icon: string }> = {
  VIP:      { label: "VIP",      style: "bg-amber-500/10 text-amber-400 border border-amber-500/20", icon: "★" },
  REGULAR:  { label: "Regular",  style: "bg-green-500/10 text-green-400 border border-green-500/20", icon: "●" },
  AT_RISK:  { label: "Em risco", style: "bg-red-500/10 text-red-400 border border-red-500/20",    icon: "⚠" },
  NEW:      { label: "Novo",     style: "bg-blue-500/10 text-blue-400 border border-blue-500/20",   icon: "◆" },
  INACTIVE: { label: "Inativo",  style: "bg-zinc-700 text-zinc-400 border border-zinc-600",          icon: "○" },
}

export default function ClientesIAPage() {
  const [clientes, setClientes] = useState<ClienteIA[]>([])
  const [insight, setInsight] = useState("")
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [filtro, setFiltro] = useState("TODOS")
  const [ordenar, setOrdenar] = useState("risco")

  // Recuperar: modal de mensagem IA
  const [recuperando, setRecuperando] = useState<string | null>(null)
  const [mensagemIA, setMensagemIA] = useState<{ clienteId: string; texto: string } | null>(null)
  const [gerandoMsg, setGerandoMsg] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    fetch("/api/ia/clientes")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro(d.error); return }
        setClientes(d.clientes ?? [])
        setInsight(d.insight ?? "")
      })
      .catch(e => setErro(String(e)))
      .finally(() => setLoading(false))
  }, [])

  async function gerarMensagem(cliente: ClienteIA) {
    setRecuperando(cliente.id)
    setGerandoMsg(true)
    setMensagemIA(null)
    try {
      const res = await fetch("/api/ia/clientes/mensagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: cliente.id }),
      })
      const d = await res.json()
      setMensagemIA({ clienteId: cliente.id, texto: d.mensagem ?? d.error ?? "Erro ao gerar mensagem" })
    } finally {
      setGerandoMsg(false)
    }
  }

  function copiarMensagem(texto: string) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  async function enviarViaApi(cliente: ClienteIA, texto: string) {
    setEnviando(true)
    try {
      const res = await fetch("/api/whatsapp/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: cliente.telefone,
          mensagem: texto,
          clientId: cliente.id,
          clientName: cliente.nome,
        }),
      })
      const d = await res.json()
      if (d.ok) {
        setEnviado(true)
        setTimeout(() => setEnviado(false), 3000)
      } else {
        alert(d.error || "Erro ao enviar mensagem")
      }
    } finally {
      setEnviando(false)
    }
  }

  const filtrados = clientes
    .filter(c => filtro === "TODOS" || c.segmento === filtro)
    .sort((a, b) => {
      if (ordenar === "risco") return b.risco - a.risco
      if (ordenar === "ticket") return b.ticket - a.ticket
      if (ordenar === "visitas") return b.visitas - a.visitas
      if (ordenar === "gasto") return b.totalGasto - a.totalGasto
      return 0
    })

  const vips = clientes.filter(c => c.segmento === "VIP").length
  const emRisco = clientes.filter(c => c.segmento === "AT_RISK" || c.risco >= 70).length
  const inativos = clientes.filter(c => c.segmento === "INACTIVE").length
  const ticketMedio = clientes.length > 0
    ? Math.round(clientes.reduce((s, c) => s + c.ticket, 0) / clientes.length)
    : 0

  const clienteRecuperando = recuperando ? clientes.find(c => c.id === recuperando) : null

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">⬡ IA — Ranking de Clientes</h1>
          <p className="text-zinc-500 text-sm">Segmentação automática · Score de risco · Ações inteligentes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-amber-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Clientes VIP</div>
          <div className="text-amber-400 text-2xl font-bold">{loading ? "—" : vips}</div>
          <div className="text-zinc-600 text-xs mt-1">alta frequência e valor</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-red-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Em risco</div>
          <div className="text-red-400 text-2xl font-bold">{loading ? "—" : emRisco}</div>
          <div className="text-zinc-600 text-xs mt-1">acima do intervalo habitual</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-zinc-600">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Inativos</div>
          <div className="text-zinc-400 text-2xl font-bold">{loading ? "—" : inativos}</div>
          <div className="text-zinc-600 text-xs mt-1">sem visita há muito tempo</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-blue-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Ticket médio</div>
          <div className="text-blue-400 text-2xl font-bold">{loading ? "—" : `R$ ${ticketMedio}`}</div>
          <div className="text-zinc-600 text-xs mt-1">média geral da base</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "VIP", "REGULAR", "AT_RISK", "NEW", "INACTIVE"].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filtro === f
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}>
              {f === "TODOS" ? "Todos" : f === "AT_RISK" ? "Em risco" : f === "NEW" ? "Novos" : f === "INACTIVE" ? "Inativos" : f}
            </button>
          ))}
        </div>
        <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg px-3 py-1.5 text-xs outline-none">
          <option value="risco">Ordenar por risco</option>
          <option value="ticket">Ordenar por ticket</option>
          <option value="visitas">Ordenar por visitas</option>
          <option value="gasto">Ordenar por gasto total</option>
        </select>
      </div>

      {/* Erro */}
      {erro && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-red-400 text-sm">{erro}</div>}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse h-16" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">Nenhum cliente nesta categoria.</div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((cliente, i) => {
            const seg = segmentoConfig[cliente.segmento] ?? segmentoConfig.REGULAR
            return (
              <div key={cliente.id}
                className={`bg-zinc-900 border rounded-xl p-4 transition-all hover:border-zinc-700 ${cliente.risco >= 70 ? "border-red-500/20" : "border-zinc-800"}`}>
                <div className="flex items-center gap-4">
                  <div className="text-zinc-600 font-mono text-sm w-6 text-center flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {cliente.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white text-sm font-medium">{cliente.nome}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${seg.style}`}>{seg.icon} {seg.label}</span>
                    </div>
                    <div className="text-zinc-500 text-xs">{cliente.telefone} · {cliente.visitas} visita{cliente.visitas !== 1 ? "s" : ""} · R$ {cliente.totalGasto.toLocaleString("pt-BR")} total</div>
                  </div>
                  <div className="flex-shrink-0 text-center w-20">
                    <div className="text-xs text-zinc-600 mb-1">Score risco</div>
                    <div className={`text-lg font-bold ${cliente.risco >= 70 ? "text-red-400" : cliente.risco >= 40 ? "text-amber-400" : "text-green-400"}`}>
                      {cliente.risco}%
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                      <div className={`h-full rounded-full ${cliente.risco >= 70 ? "bg-red-500" : cliente.risco >= 40 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${cliente.risco}%` }} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-center w-20">
                    <div className="text-xs text-zinc-600 mb-1">Sem visita</div>
                    <div className={`text-lg font-bold ${cliente.diasSemVisita > cliente.intervalo && cliente.intervalo > 0 ? "text-red-400" : "text-zinc-300"}`}>
                      {cliente.diasSemVisita > 0 ? `${cliente.diasSemVisita}d` : "—"}
                    </div>
                    <div className="text-xs text-zinc-600">intervalo: {cliente.intervalo > 0 ? `${cliente.intervalo}d` : "—"}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {cliente.risco >= 60 ? (
                      <button onClick={() => gerarMensagem(cliente)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/20 transition-colors">
                        💬 Recuperar
                      </button>
                    ) : cliente.segmento === "VIP" ? (
                      <button className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg text-xs border border-amber-500/20 transition-colors">
                        ★ Mimar VIP
                      </button>
                    ) : (
                      <a href="/dashboard/clientes" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg text-xs border border-zinc-700 transition-colors">
                        Ver perfil →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Insight IA */}
      {(loading || insight) && (
        <div className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-2">⬡ Insight da IA</div>
          {loading
            ? <div className="text-zinc-500 text-sm animate-pulse">Analisando base de clientes com IA...</div>
            : <div className="text-zinc-300 text-sm leading-relaxed">{insight}</div>}
        </div>
      )}

      {/* Modal mensagem recuperação */}
      {recuperando && clienteRecuperando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setRecuperando(null); setMensagemIA(null) }}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div>
                <h2 className="text-white font-bold">💬 Recuperar cliente</h2>
                <p className="text-zinc-500 text-xs mt-0.5">{clienteRecuperando.nome}</p>
              </div>
              <button onClick={() => { setRecuperando(null); setMensagemIA(null) }} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {gerandoMsg ? (
                <div className="text-zinc-500 text-sm animate-pulse text-center py-4">⬡ IA gerando mensagem personalizada...</div>
              ) : mensagemIA ? (
                <>
                  <div className="bg-zinc-800 rounded-xl p-4 text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {mensagemIA.texto}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copiarMensagem(mensagemIA.texto)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${copiado ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"}`}>
                      {copiado ? "✓ Copiado!" : "Copiar"}
                    </button>
                    <button
                      onClick={() => enviarViaApi(clienteRecuperando, mensagemIA.texto)}
                      disabled={enviando || enviado}
                      className={`flex-1 flex items-center justify-center font-medium py-2.5 rounded-lg text-sm border transition-colors disabled:opacity-60 ${enviado ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-green-500/15 hover:bg-green-500/25 text-green-400 border-green-500/20"}`}>
                      {enviado ? "✓ Enviado!" : enviando ? "Enviando..." : "Enviar →"}
                    </button>
                  </div>
                  <button onClick={() => gerarMensagem(clienteRecuperando)}
                    className="w-full text-zinc-600 hover:text-zinc-400 text-xs py-1.5 transition-colors">
                    Gerar outra versão
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
