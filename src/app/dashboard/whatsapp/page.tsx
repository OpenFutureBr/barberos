"use client"

import { useState, useEffect, useRef } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { enviarWhatsApp } from "@/lib/whatsapp"

type Cliente = { id: string; name: string; phone: string }

const automacoesMock = [
  { id: "1", nome: "Confirmação de agendamento", descricao: "Enviada 24h antes do horário", ativa: true, tipo: "confirmacao", enviadas: 47 },
  { id: "2", nome: "Lembrete 1h antes", descricao: "Enviada 1h antes do horário", ativa: true, tipo: "lembrete", enviadas: 43 },
  { id: "3", nome: "Cliente em risco", descricao: "Enviada quando cliente passa do intervalo habitual", ativa: true, tipo: "risco", enviadas: 12 },
  { id: "4", nome: "PIX gerado", descricao: "Envia link do PIX após confirmar o serviço", ativa: true, tipo: "pix", enviadas: 156 },
  { id: "5", nome: "Aniversário", descricao: "Parabéns com cupom de desconto no dia do aniversário", ativa: false, tipo: "aniversario", enviadas: 8 },
  { id: "6", nome: "Pós-atendimento", descricao: "Avaliação enviada após o atendimento", ativa: false, tipo: "avaliacao", enviadas: 0 },
]

const tipoStyle: Record<string, string> = {
  confirmacao: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  lembrete: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  risco: "bg-red-500/10 text-red-400 border border-red-500/20",
  pix: "bg-green-500/10 text-green-400 border border-green-500/20",
  aniversario: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  avaliacao: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
}

const tipoLabel: Record<string, string> = {
  confirmacao: "Confirmação", lembrete: "Lembrete", risco: "Risco",
  pix: "PIX", aniversario: "Aniversário", avaliacao: "Avaliação",
}

const TEMPLATES = [
  { label: "Lembrete", texto: (nome: string) => `Olá ${nome}! Lembrando do seu horário na Barbearia Costa. Qualquer dúvida é só chamar! 💈` },
  { label: "Retorno", texto: (nome: string) => `Olá ${nome}! Sentimos sua falta por aqui 😊 Que tal agendar um horário? Estamos te esperando!` },
  { label: "Promoção", texto: (nome: string) => `Olá ${nome}! Temos uma novidade especial para você. Entre em contato para saber mais! 🎉` },
  { label: "Confirmação PIX", texto: (nome: string) => `Olá ${nome}! Seu pagamento foi confirmado. Obrigado pela preferência! ✅` },
]

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
    setSelecionado(c)
    setBusca(c.name)
    setAberto(false)
    onSelect(c)
  }

  function limpar() {
    setSelecionado(null)
    setBusca("")
    onSelect(null)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-green-500 transition-colors">
        <input
          value={busca}
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
            <button key={c.id} type="button"
              onMouseDown={() => selecionar(c)}
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

function FormEnvio({ onEnviado }: { onEnviado?: () => void }) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [mensagem, setMensagem] = useState("")
  const [status, setStatus] = useState<"idle" | "enviando" | "ok" | "erro">("idle")

  async function handleEnviar() {
    if (!cliente || !mensagem.trim()) return
    setStatus("enviando")
    const result = await enviarWhatsApp(cliente.phone, mensagem)
    setStatus(result.ok ? "ok" : "erro")
    if (result.ok) {
      setTimeout(() => { setStatus("idle"); setMensagem(""); setCliente(null); onEnviado?.() }, 2500)
    } else {
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-zinc-400 text-xs mb-1.5 block">Cliente *</label>
        <ClienteCombobox onSelect={setCliente} />
        {cliente && (
          <div className="mt-1.5 text-xs text-zinc-500 font-mono">
            Telefone: {cliente.phone}
          </div>
        )}
      </div>

      <div>
        <label className="text-zinc-400 text-xs mb-1.5 block">Mensagem *</label>
        <textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          rows={4}
          placeholder="Digite a mensagem..."
          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600 resize-none"
        />
      </div>

      <div>
        <div className="text-zinc-500 text-xs mb-2">Templates rápidos:</div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button key={t.label} type="button"
              onClick={() => setMensagem(t.texto(cliente?.name ?? "cliente"))}
              className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-green-500/30 hover:text-green-400 transition-colors">
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleEnviar}
        disabled={!cliente || !mensagem.trim() || status === "enviando"}
        className={`w-full font-semibold px-4 py-2.5 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          status === "ok" ? "bg-green-500/30 text-green-400 border-green-500/30" :
          status === "erro" ? "bg-red-500/20 text-red-400 border-red-500/20" :
          "bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/20"
        }`}
      >
        {status === "enviando" ? "Enviando..." : status === "ok" ? "✓ Enviado!" : status === "erro" ? "✕ Erro ao enviar" : "Enviar mensagem"}
      </button>
    </div>
  )
}

export default function WhatsAppPage() {
  const [aba, setAba] = useState<"automacoes" | "enviar">("enviar")
  const [automacoes, setAutomacoes] = useState(automacoesMock)

  function toggleAutomacao(id: string) {
    setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativa: !a.ativa } : a))
  }

  const ativas = automacoes.filter(a => a.ativa).length

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">WhatsApp</h1>
          <p className="text-zinc-500 text-sm">Evolution API · {ativas} automações ativas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-400 text-xs">Conectado</span>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "enviar", label: "Envio manual" },
          { id: "automacoes", label: "Automações" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Envio manual */}
      {aba === "enviar" && (
        <div className="max-w-lg">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <FormEnvio />
          </div>
        </div>
      )}

      {/* Automações */}
      {aba === "automacoes" && (
        <div className="space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-sm mb-2">
            As automações serão implementadas em breve. Por enquanto use o envio manual.
          </div>
          {automacoes.map(auto => (
            <div key={auto.id} className={`bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 transition-all ${auto.ativa ? "border-zinc-700" : "border-zinc-800 opacity-60"}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{auto.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tipoStyle[auto.tipo]}`}>{tipoLabel[auto.tipo]}</span>
                </div>
                <div className="text-zinc-500 text-xs">{auto.descricao}</div>
                <div className="text-zinc-600 text-xs mt-1">{auto.enviadas} mensagens enviadas</div>
              </div>
              <div onClick={() => toggleAutomacao(auto.id)}
                className={`w-11 h-6 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${auto.ativa ? "bg-green-500" : "bg-zinc-700"}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${auto.ativa ? "left-6" : "left-1"}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
