"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const mensagensMock = [
  { id: "1", tipo: "confirmacao", cliente: "João Ribeiro", telefone: "(11) 96543-2109", mensagem: "Olá João! Confirmando seu agendamento amanhã às 14h com Lucas. Responda SIM para confirmar ou NÃO para cancelar.", status: "entregue", hora: "13:00" },
  { id: "2", tipo: "lembrete", cliente: "Felipe Gomes", telefone: "(11) 99874-3312", mensagem: "Oi Felipe! Daqui 1 hora é seu horário com Lucas às 14h. Te esperamos! 💈", status: "entregue", hora: "13:00" },
  { id: "3", tipo: "risco", cliente: "Carlos Souza", telefone: "(11) 97654-3210", mensagem: "Oi Carlos! Faz 41 dias que não te vemos por aqui. Que tal agendar um corte? Use o link: barberos.com/barbearia-costa", status: "entregue", hora: "10:00" },
  { id: "4", tipo: "risco", cliente: "Marcos Andrade", telefone: "(11) 95432-1098", mensagem: "Oi Marcos! Sentimos sua falta! Já faz 32 dias. Agende agora com 10% de desconto: barberos.com/barbearia-costa", status: "lido", hora: "10:00" },
  { id: "5", tipo: "pix", cliente: "Pedro Silva", telefone: "(11) 98765-4321", mensagem: "Olá Pedro! Segue o PIX para seu corte de hoje: R$ 65,00. Chave PIX: barberos.com/pix/1234", status: "lido", hora: "09:15" },
]

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
  confirmacao: "Confirmação",
  lembrete: "Lembrete",
  risco: "Risco",
  pix: "PIX",
  aniversario: "Aniversário",
  avaliacao: "Avaliação",
}

const statusStyle: Record<string, string> = {
  entregue: "text-green-400",
  lido: "text-blue-400",
  falhou: "text-red-400",
  pendente: "text-amber-400",
}

const statusLabel: Record<string, string> = {
  entregue: "✓ Entregue",
  lido: "✓✓ Lido",
  falhou: "✕ Falhou",
  pendente: "⏱ Pendente",
}

export default function WhatsAppPage() {
  const [aba, setAba] = useState<"automacoes" | "historico" | "enviar">("automacoes")
  const [automacoes, setAutomacoes] = useState(automacoesMock)
  const [modalEnviar, setModalEnviar] = useState(false)
  const [mensagemManual, setMensagemManual] = useState("")
  const [clienteManual, setClienteManual] = useState("")

  function toggleAutomacao(id: string) {
    setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativa: !a.ativa } : a))
  }

  const totalEnviadas = automacoes.reduce((s, a) => s + a.enviadas, 0)
  const ativas = automacoes.filter(a => a.ativa).length

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">WhatsApp Automático</h1>
          <p className="text-zinc-500 text-sm">Evolution API · {ativas} automações ativas · {totalEnviadas} mensagens enviadas</p>
        </div>
        <button
          onClick={() => setModalEnviar(true)}
          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm border border-green-500/20 transition-colors font-medium"
        >
          💬 Enviar mensagem
        </button>
      </div>

      {/* Status da conexão */}
      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0"></div>
        <div className="flex-1">
          <div className="text-green-400 text-sm font-medium">WhatsApp conectado · Evolution API</div>
          <div className="text-zinc-500 text-xs">Número: (11) 99999-0000 · Barbearia Costa</div>
        </div>
        <div className="text-right">
          <div className="text-green-400 text-xs font-mono">{totalEnviadas} msgs</div>
          <div className="text-zinc-600 text-xs">este mês</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "automacoes", label: "⚡ Automações" },
          { id: "historico", label: "📋 Histórico" },
          { id: "enviar", label: "💬 Envio manual" },
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

      {/* Aba Automações */}
      {aba === "automacoes" && (
        <div className="space-y-3">
          {automacoes.map((auto) => (
            <div key={auto.id} className={`bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 transition-all ${auto.ativa ? "border-zinc-700" : "border-zinc-800 opacity-60"}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{auto.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tipoStyle[auto.tipo]}`}>
                    {tipoLabel[auto.tipo]}
                  </span>
                </div>
                <div className="text-zinc-500 text-xs">{auto.descricao}</div>
                <div className="text-zinc-600 text-xs mt-1">{auto.enviadas} mensagens enviadas</div>
              </div>

              {/* Toggle */}
              <div
                onClick={() => toggleAutomacao(auto.id)}
                className={`w-11 h-6 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${auto.ativa ? "bg-green-500" : "bg-zinc-700"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${auto.ativa ? "left-6" : "left-1"}`}></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aba Histórico */}
      {aba === "historico" && (
        <div className="space-y-3">
          {mensagensMock.map((msg) => (
            <div key={msg.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{msg.cliente}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tipoStyle[msg.tipo]}`}>
                    {tipoLabel[msg.tipo]}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs ${statusStyle[msg.status]}`}>{statusLabel[msg.status]}</span>
                  <span className="text-zinc-600 text-xs font-mono">{msg.hora}</span>
                </div>
              </div>
              <div className="text-zinc-500 text-xs">{msg.telefone}</div>
              <div className="bg-zinc-800 rounded-lg p-3 mt-2">
                <div className="text-zinc-300 text-sm leading-relaxed">{msg.mensagem}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aba Envio manual */}
      {aba === "enviar" && (
        <div className="max-w-lg">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Cliente *</label>
              <input
                value={clienteManual}
                onChange={(e) => setClienteManual(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Mensagem *</label>
              <textarea
                value={mensagemManual}
                onChange={(e) => setMensagemManual(e.target.value)}
                rows={4}
                placeholder="Digite a mensagem..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600 resize-none"
              />
            </div>

            {/* Templates rápidos */}
            <div>
              <div className="text-zinc-500 text-xs mb-2">Templates rápidos:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Lembrete de agendamento",
                  "Promoção especial",
                  "Convite para retorno",
                  "Confirmação de PIX",
                ].map((t) => (
                  <button
                    key={t}
                    onClick={() => setMensagemManual(`Olá! ${t} - Barbearia Costa`)}
                    className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-green-500/30 hover:text-green-400 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-green-500/20 transition-colors"
            >
              💬 Enviar via WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Modal enviar */}
      {modalEnviar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Enviar mensagem</h2>
              <button onClick={() => setModalEnviar(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Cliente</label>
                <input placeholder="Buscar cliente..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Mensagem</label>
                <textarea rows={3} placeholder="Digite a mensagem..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 transition-colors placeholder:text-zinc-600 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalEnviar(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button onClick={() => setModalEnviar(false)} className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-green-500/20 transition-colors">Enviar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}