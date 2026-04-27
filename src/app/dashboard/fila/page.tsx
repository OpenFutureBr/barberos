"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const atendimentoAtual = {
  cliente: "Carlos Andrade",
  servico: "Corte + Barba",
  profissional: "Lucas Carvalho",
  inicio: "13:48",
  duracaoMin: 45,
}

const filaMock = [
  { id: "1", pos: 1, cliente: "João Ribeiro", servico: "Corte + Barba", profissional: "Lucas", espera: 12, tipo: "agendado" },
  { id: "2", pos: 2, cliente: "Roberto Maia", servico: "Corte", profissional: "Qualquer", espera: 25, tipo: "walkin" },
  { id: "3", pos: 3, cliente: "Tiago Nunes", servico: "Barba", profissional: "Miguel", espera: 35, tipo: "walkin" },
  { id: "4", pos: 4, cliente: "Paulo Azevedo", servico: "Corte + Barba", profissional: "Rafael", espera: 55, tipo: "agendado" },
]

const tipoStyle: Record<string, string> = {
  agendado: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  walkin: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
}

const tipoLabel: Record<string, string> = {
  agendado: "Agendado",
  walkin: "Walk-in",
}

export default function FilaPage() {
  const [tempo, setTempo] = useState(0)
  const [modalEntrar, setModalEntrar] = useState(false)
  const [nomeCliente, setNomeCliente] = useState("")
  const [servico, setServico] = useState("Corte de Cabelo")
  const [tipoEntrada, setTipoEntrada] = useState("walkin")

  // Simulação de tempo real — atualiza a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setTempo((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calcula tempo decorrido desde 13:48
  const minutosDecorridos = Math.floor(tempo / 60)
  const segundosDecorridos = tempo % 60
  const tempoRestante = Math.max(0, atendimentoAtual.duracaoMin - minutosDecorridos)

  function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
    setModalEntrar(false)
    setNomeCliente("")
  }

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Fila de Espera</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-zinc-500 text-sm">{filaMock.length} aguardando · espera média 32 min · ao vivo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalEntrar(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Entrar na fila
          </button>
          <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors">
            📺 Painel TV
          </button>
        </div>
      </div>

      {/* Em atendimento agora */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✂️</div>
            <div>
              <div className="text-xs text-amber-400 font-mono uppercase tracking-widest mb-1">
                Em atendimento agora
              </div>
              <div className="text-white font-bold text-base">{atendimentoAtual.cliente}</div>
              <div className="text-zinc-400 text-sm">
                {atendimentoAtual.servico} · {atendimentoAtual.profissional} · início {atendimentoAtual.inicio}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 mb-1">Tempo restante</div>
            <div className="text-amber-400 font-bold text-2xl font-mono">
              {String(tempoRestante).padStart(2, "0")}:{String(59 - segundosDecorridos).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, (minutosDecorridos / atendimentoAtual.duracaoMin) * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Header da fila */}
      <div className="grid grid-cols-5 gap-3 px-3 mb-2 text-xs text-zinc-600 font-mono uppercase tracking-widest">
        <span>Pos.</span>
        <span className="col-span-2">Cliente</span>
        <span>Espera</span>
        <span>Status</span>
      </div>

      {/* Itens da fila */}
      <div className="space-y-2">
        {filaMock.map((item) => (
          <div
            key={item.id}
            className={`grid grid-cols-5 gap-3 p-3 rounded-xl border items-center cursor-pointer transition-all hover:border-zinc-700 ${
              item.pos === 1
                ? "bg-amber-500/5 border-amber-500/25"
                : "bg-zinc-900 border-zinc-800"
            }`}
          >
            {/* Posição */}
            <div className={`font-bold text-lg font-mono ${item.pos === 1 ? "text-amber-400" : "text-zinc-600"}`}>
              {item.pos}º
            </div>

            {/* Cliente */}
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {item.cliente.charAt(0)}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{item.cliente}</div>
                  <div className="text-zinc-500 text-xs">{item.servico} · {item.profissional}</div>
                </div>
              </div>
            </div>

            {/* Espera */}
            <div>
              <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${Math.max(10, 100 - (item.espera / 60) * 100)}%` }}
                ></div>
              </div>
              <div className="text-zinc-500 text-xs font-mono">~{item.espera} min</div>
            </div>

            {/* Status */}
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${tipoStyle[item.tipo]}`}>
                {tipoLabel[item.tipo]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Info tempo real */}
      <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></div>
        <span className="text-zinc-500 text-xs">
          Atualização em tempo real via Supabase Realtime · conectado · último update agora
        </span>
      </div>

      {/* Modal entrar na fila */}
      {modalEntrar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Entrar na Fila</h2>
              <button onClick={() => setModalEntrar(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleEntrar} className="p-5 space-y-3">

              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Tipo de entrada</label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setTipoEntrada("walkin")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      tipoEntrada === "walkin"
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  >
                    <div className={`text-sm font-medium ${tipoEntrada === "walkin" ? "text-blue-400" : "text-zinc-400"}`}>
                      🚶 Walk-in
                    </div>
                    <div className="text-zinc-600 text-xs mt-0.5">Cliente sem agendamento</div>
                  </div>
                  <div
                    onClick={() => setTipoEntrada("agendado")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      tipoEntrada === "agendado"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  >
                    <div className={`text-sm font-medium ${tipoEntrada === "agendado" ? "text-amber-400" : "text-zinc-400"}`}>
                      📅 Agendado
                    </div>
                    <div className="text-zinc-600 text-xs mt-0.5">Chegou no horário</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome do cliente *</label>
                <input
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  required
                  placeholder="Buscar ou digitar nome..."
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Serviço *</label>
                <select
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  <option>Corte de Cabelo — R$ 65</option>
                  <option>Corte + Barba — R$ 95</option>
                  <option>Barba Completa — R$ 45</option>
                  <option>Progressiva — R$ 180</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEntrar(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Adicionar à fila
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}