"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { enviarWhatsApp } from "@/lib/whatsapp"
import Image from "next/image"

// ─── Types ────────────────────────────────────────────────────────────────────

type Cliente = { id: string; name: string; phone: string }

type Automacao = {
  tipo: string
  nome: string
  descricao: string
  ativa: boolean
  enviadas: number
}

type LogEntry = {
  id: string
  clientName: string
  phone: string
  message: string
  status: string
  errorMsg: string | null
  source: string
  automationType: string | null
  sentAt: string
}

type ConnectionState = "open" | "close" | "connecting" | "unknown"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_STYLE: Record<string, string> = {
  confirmacao: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  lembrete: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  risco: "bg-red-500/10 text-red-400 border border-red-500/20",
  pix: "bg-green-500/10 text-green-400 border border-green-500/20",
  aniversario: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  avaliacao: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
}

const TIPO_LABEL: Record<string, string> = {
  confirmacao: "Confirmação", lembrete: "Lembrete", risco: "Risco",
  pix: "PIX", aniversario: "Aniversário", avaliacao: "Avaliação",
}

const TEMPLATES = [
  { label: "Lembrete", texto: (nome: string) => `Olá ${nome}! Lembrando do seu horário na Barbearia. Qualquer dúvida é só chamar! 💈` },
  { label: "Retorno", texto: (nome: string) => `Olá ${nome}! Sentimos sua falta 😊 Que tal agendar um horário? Estamos te esperando!` },
  { label: "Promoção", texto: (nome: string) => `Olá ${nome}! Temos uma novidade especial para você. Entre em contato para saber mais! 🎉` },
  { label: "Confirmar PIX", texto: (nome: string) => `Olá ${nome}! Seu pagamento foi confirmado. Obrigado pela preferência! ✅` },
]

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

// ─── ClienteCombobox ──────────────────────────────────────────────────────────

function ClienteCombobox({ onSelect }: { onSelect: (c: Cliente | null) => void }) {
  const [busca, setBusca] = useState("")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [todos, setTodos] = useState<Cliente[]>([])
  const [aberto, setAberto] = useState(false)
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/clientes?modo=simples").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTodos(d)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!busca) { setClientes(todos.slice(0, 8)); return }
    const q = busca.toLowerCase()
    setClientes(todos.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8))
  }, [busca, todos])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function selecionar(c: Cliente) {
    setSelecionado(c); setBusca(c.name); setAberto(false); onSelect(c)
  }
  function limpar() {
    setSelecionado(null); setBusca(""); onSelect(null)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-green-500 transition-colors">
        <input value={busca}
          onChange={e => { setBusca(e.target.value); setAberto(true); if (selecionado) { setSelecionado(null); onSelect(null) } }}
          onFocus={() => setAberto(true)}
          placeholder="Buscar cliente por nome ou telefone..."
          className="flex-1 bg-transparent text-white px-3 py-2 text-sm outline-none placeholder:text-zinc-600"
        />
        {selecionado && (
          <button onClick={limpar} className="px-3 text-zinc-500 hover:text-white transition-colors text-sm">✕</button>
        )}
      </div>
      {aberto && clientes.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {clientes.map(c => (
            <button key={c.id} type="button" onMouseDown={() => selecionar(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-700 transition-colors text-left">
              <div className="w-7 h-7 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate">{c.name}</div>
                <div className="text-zinc-500 text-xs font-mono">{c.phone}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {aberto && busca && clientes.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 px-3 py-3 text-zinc-600 text-sm">
          Nenhum cliente encontrado
        </div>
      )}
    </div>
  )
}

// ─── QR Code Modal ────────────────────────────────────────────────────────────

function QrModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function conectar() {
      setLoading(true)
      try {
        const res = await fetch("/api/whatsapp/status", { method: "POST" })
        const data = await res.json()
        if (data.qrcode) {
          setQr(data.qrcode)
        } else if (data.state === "open") {
          onConnected()
          return
        } else {
          setErro("Não foi possível obter o QR Code.")
        }
      } catch {
        setErro("Erro ao conectar.")
      } finally {
        setLoading(false)
      }
    }
    conectar()
  }, [onConnected])

  // Poll connection state while showing QR
  useEffect(() => {
    if (!qr) return
    const interval = setInterval(async () => {
      const res = await fetch("/api/whatsapp/status")
      const data = await res.json()
      if (data.state === "open") {
        onConnected()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [qr, onConnected])

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
        <h2 className="text-white font-bold text-lg mb-1">Conectar WhatsApp</h2>
        <p className="text-zinc-500 text-sm mb-5">Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo</p>

        {loading && <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">Gerando QR Code...</div>}
        {erro && <div className="h-48 flex items-center justify-center text-red-400 text-sm">{erro}</div>}
        {qr && !loading && (
          <div className="relative w-48 h-48 mx-auto bg-white rounded-xl overflow-hidden">
            <Image src={qr} alt="QR Code WhatsApp" fill className="object-contain" unoptimized />
          </div>
        )}

        {qr && (
          <p className="text-zinc-600 text-xs mt-3 animate-pulse">Aguardando leitura do QR Code...</p>
        )}

        <button onClick={onClose} className="mt-5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          Fechar
        </button>
      </div>
    </div>
  )
}

// ─── Aba: Envio Manual ────────────────────────────────────────────────────────

function AbaEnvio({ connected }: { connected: boolean }) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [mensagem, setMensagem] = useState("")
  const [status, setStatus] = useState<"idle" | "enviando" | "ok" | "erro">("idle")
  const [erroMsg, setErroMsg] = useState<string | null>(null)

  async function handleEnviar() {
    if (!cliente || !mensagem.trim()) return
    if (!cliente.phone) { setErroMsg("Este cliente não tem telefone cadastrado."); return }
    setStatus("enviando"); setErroMsg(null)
    const result = await enviarWhatsApp(cliente.phone, mensagem, { clientId: cliente.id, clientName: cliente.name })
    if (result.ok) {
      setStatus("ok")
      setTimeout(() => { setStatus("idle"); setMensagem(""); setCliente(null) }, 2500)
    } else {
      setStatus("erro"); setErroMsg(result.erro ?? "Erro ao enviar")
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      {!connected && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-sm">
          WhatsApp desconectado. Conecte a instância antes de enviar mensagens.
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div>
          <label className="text-zinc-400 text-xs mb-1.5 block">Cliente *</label>
          <ClienteCombobox onSelect={setCliente} />
          {cliente && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-zinc-500 text-xs font-mono">{cliente.phone || "—"}</span>
              {!cliente.phone && <span className="text-red-400 text-xs">Sem telefone cadastrado</span>}
            </div>
          )}
        </div>

        <div>
          <label className="text-zinc-400 text-xs mb-1.5 block">Mensagem *</label>
          <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4}
            placeholder="Digite a mensagem..."
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600 resize-none"
          />
          <div className="text-zinc-600 text-xs text-right mt-0.5">{mensagem.length} caracteres</div>
        </div>

        <div>
          <div className="text-zinc-500 text-xs mb-2">Templates rápidos:</div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <button key={t.label} type="button"
                onClick={() => setMensagem(t.texto(cliente?.name ?? "cliente"))}
                className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-green-500/40 hover:text-green-400 transition-colors">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {erroMsg && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erroMsg}</div>
        )}

        <button onClick={handleEnviar}
          disabled={!cliente || !mensagem.trim() || !cliente.phone || status === "enviando" || !connected}
          className={`w-full font-semibold px-4 py-2.5 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            status === "ok" ? "bg-green-500/30 text-green-400 border-green-500/30" :
            status === "erro" ? "bg-red-500/20 text-red-400 border-red-500/20" :
            "bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/20"
          }`}>
          {status === "enviando" ? "Enviando..." : status === "ok" ? "✓ Enviado!" : status === "erro" ? "✕ Falha no envio" : "Enviar mensagem"}
        </button>
      </div>
    </div>
  )
}

// ─── Aba: Automações ──────────────────────────────────────────────────────────

function AbaAutomacoes() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/whatsapp/automacoes").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setAutomacoes(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function toggleAutomacao(tipo: string, atual: boolean) {
    setSalvando(tipo)
    const novoValor = !atual
    setAutomacoes(prev => prev.map(a => a.tipo === tipo ? { ...a, ativa: novoValor } : a))
    await fetch("/api/whatsapp/automacoes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, ativa: novoValor }),
    })
    setSalvando(null)
  }

  if (loading) return <div className="text-zinc-600 text-sm pt-2">Carregando...</div>

  const ativas = automacoes.filter(a => a.ativa).length

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-sm">
        As automações estão em desenvolvimento — os disparos ainda não ocorrem automaticamente. Configure agora e ative quando disponível.
      </div>

      <div className="flex items-center gap-2 pb-1">
        <span className="text-zinc-500 text-xs">{ativas} de {automacoes.length} automações ativas</span>
      </div>

      {automacoes.map(auto => (
        <div key={auto.tipo} className={`bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 transition-all ${auto.ativa ? "border-zinc-700" : "border-zinc-800 opacity-60"}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-white text-sm font-medium">{auto.nome}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_STYLE[auto.tipo] ?? "bg-zinc-700 text-zinc-400"}`}>
                {TIPO_LABEL[auto.tipo] ?? auto.tipo}
              </span>
            </div>
            <div className="text-zinc-500 text-xs">{auto.descricao}</div>
            <div className="text-zinc-600 text-xs mt-1">{auto.enviadas} envios nos últimos 30 dias</div>
          </div>
          <button
            onClick={() => toggleAutomacao(auto.tipo, auto.ativa)}
            disabled={salvando === auto.tipo}
            className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 disabled:opacity-50 ${auto.ativa ? "bg-green-500" : "bg-zinc-700"}`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${auto.ativa ? "left-6" : "left-1"}`} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Aba: Histórico ───────────────────────────────────────────────────────────

function AbaHistorico() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filtro, setFiltro] = useState<"" | "ok" | "erro">("")
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  const carregar = useCallback(async (p: number, f: string) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(p), pageSize: "20" })
      if (f) qs.set("status", f)
      const res = await fetch(`/api/whatsapp/historico?${qs}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar(page, filtro) }, [page, filtro, carregar])

  function mudarFiltro(f: "" | "ok" | "erro") {
    setFiltro(f); setPage(1)
  }

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-zinc-500 text-xs">{total} mensagens no total</span>
        <div className="flex gap-1 ml-auto">
          {(["", "ok", "erro"] as const).map(f => (
            <button key={f} onClick={() => mudarFiltro(f)}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${filtro === f
                ? f === "erro" ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : f === "ok" ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-zinc-700 text-white border-zinc-600"
                : "bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500"}`}>
              {f === "" ? "Todos" : f === "ok" ? "Enviados" : "Com erro"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-zinc-600 text-sm py-4">Carregando...</div>}

      {!loading && logs.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-8 text-center text-zinc-600 text-sm">
          Nenhuma mensagem encontrada.
        </div>
      )}

      {!loading && logs.map(log => (
        <div key={log.id} className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${log.status === "erro" ? "border-red-500/20" : "border-zinc-800"}`}>
          <button className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
            onClick={() => setExpandido(expandido === log.id ? null : log.id)}>
            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-sm font-medium truncate">{log.clientName}</span>
                <span className="text-zinc-600 text-xs font-mono">{log.phone}</span>
                {log.source === "automation" && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${TIPO_STYLE[log.automationType ?? ""] ?? "bg-zinc-700 text-zinc-400"}`}>
                    {TIPO_LABEL[log.automationType ?? ""] ?? "Auto"}
                  </span>
                )}
              </div>
              <div className="text-zinc-500 text-xs mt-0.5 truncate">{log.message}</div>
            </div>
            <span className="text-zinc-600 text-xs flex-shrink-0">{fmtDate(log.sentAt)}</span>
          </button>

          {expandido === log.id && (
            <div className="px-4 pb-3 border-t border-zinc-800">
              <p className="text-zinc-300 text-sm mt-3 whitespace-pre-wrap">{log.message}</p>
              {log.status === "erro" && log.errorMsg && (
                <p className="text-red-400 text-xs mt-2">Erro: {log.errorMsg}</p>
              )}
            </div>
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-700 transition-colors">
            ← Anterior
          </button>
          <span className="text-zinc-500 text-xs">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-700 transition-colors">
            Próximo →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [aba, setAba] = useState<"enviar" | "automacoes" | "historico">("enviar")
  const [connState, setConnState] = useState<ConnectionState>("unknown")
  const [showQr, setShowQr] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status")
      const data = await res.json()
      setConnState((data.state as ConnectionState) ?? "unknown")
    } catch {
      setConnState("unknown")
    }
  }, [])

  useEffect(() => {
    checkStatus()
    const id = setInterval(checkStatus, 30_000)
    return () => clearInterval(id)
  }, [checkStatus])

  const connected = connState === "open"

  const stateLabel: Record<ConnectionState, string> = {
    open: "Conectado",
    close: "Desconectado",
    connecting: "Conectando...",
    unknown: "Verificando...",
  }
  const stateDot: Record<ConnectionState, string> = {
    open: "bg-green-500",
    close: "bg-red-500",
    connecting: "bg-amber-500 animate-pulse",
    unknown: "bg-zinc-500 animate-pulse",
  }
  const stateColor: Record<ConnectionState, string> = {
    open: "text-green-400",
    close: "text-red-400",
    connecting: "text-amber-400",
    unknown: "text-zinc-500",
  }

  return (
    <DashboardLayout>
      {showQr && (
        <QrModal
          onClose={() => setShowQr(false)}
          onConnected={() => { setConnState("open"); setShowQr(false) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold">WhatsApp</h1>
          <p className="text-zinc-500 text-sm">Evolution API</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stateDot[connState]}`} />
            <span className={`text-xs ${stateColor[connState]}`}>{stateLabel[connState]}</span>
          </div>
          {!connected && (
            <button onClick={() => setShowQr(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/20 hover:bg-green-500/30 transition-colors">
              Conectar
            </button>
          )}
          {connected && (
            <button onClick={checkStatus}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors">
              Atualizar
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {([
          { id: "enviar", label: "Envio manual" },
          { id: "automacoes", label: "Automações" },
          { id: "historico", label: "Histórico" },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {aba === "enviar" && <AbaEnvio connected={connected} />}
      {aba === "automacoes" && <AbaAutomacoes />}
      {aba === "historico" && <AbaHistorico />}
    </DashboardLayout>
  )
}
