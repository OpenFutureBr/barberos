"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const servicosMock = [
  { id: "1", nome: "Corte de Cabelo", precoBase: 65, precoMin: 50, precoMax: 90, demanda: "alta", ajuste: 10 },
  { id: "2", nome: "Corte + Barba", precoBase: 95, precoMin: 80, precoMax: 130, demanda: "muito_alta", ajuste: 15 },
  { id: "3", nome: "Barba Completa", precoBase: 45, precoMin: 35, precoMax: 65, demanda: "media", ajuste: 0 },
  { id: "4", nome: "Progressiva", precoBase: 180, precoMin: 150, precoMax: 220, demanda: "baixa", ajuste: -10 },
  { id: "5", nome: "Hidratação", precoBase: 60, precoMin: 50, precoMax: 80, demanda: "media", ajuste: 0 },
  { id: "6", nome: "Fade + Hidratação", precoBase: 110, precoMin: 90, precoMax: 140, demanda: "alta", ajuste: 8 },
]

const regras = [
  { id: "1", nome: "Horário de pico", descricao: "Sex e Sáb entre 14h-18h", ajuste: "+15%", ativa: true },
  { id: "2", nome: "Baixa demanda", descricao: "Seg e Ter manhã", ajuste: "-10%", ativa: true },
  { id: "3", nome: "Cliente VIP", descricao: "Desconto automático para clientes VIP", ajuste: "-5%", ativa: true },
  { id: "4", nome: "Aniversário", descricao: "Desconto no mês do aniversário", ajuste: "-10%", ativa: false },
  { id: "5", nome: "Fila cheia", descricao: "Quando fila tiver 5+ clientes", ajuste: "+8%", ativa: false },
]

const demandaConfig: Record<string, { label: string, style: string, barColor: string, pct: number }> = {
  muito_alta: { label: "Muito alta", style: "text-red-400", barColor: "bg-red-500", pct: 95 },
  alta: { label: "Alta", style: "text-amber-400", barColor: "bg-amber-500", pct: 75 },
  media: { label: "Média", style: "text-blue-400", barColor: "bg-blue-500", pct: 50 },
  baixa: { label: "Baixa", style: "text-zinc-400", barColor: "bg-zinc-500", pct: 25 },
}

export default function PrecificacaoPage() {
  const [regrasState, setRegrasState] = useState(regras)
  const [salvo, setSalvo] = useState(false)

  function toggleRegra(id: string) {
    setRegrasState(prev => prev.map(r => r.id === id ? { ...r, ativa: !r.ativa } : r))
  }

  function handleSalvar() {
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  const regrasAtivas = regrasState.filter(r => r.ativa).length

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Precificação Dinâmica</h1>
          <p className="text-zinc-500 text-sm">Ajuste automático de preços baseado em demanda e horário</p>
        </div>
        <div className="flex items-center gap-3">
          {salvo && <span className="text-green-400 text-sm">✓ Salvo!</span>}
          <button
            onClick={handleSalvar}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Salvar configurações
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Regras ativas</div>
          <div className="text-amber-400 text-2xl font-bold">{regrasAtivas}</div>
          <div className="text-zinc-600 text-xs mt-1">de {regras.length} regras configuradas</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Serviço mais demandado</div>
          <div className="text-red-400 text-sm font-bold mt-1">Corte + Barba</div>
          <div className="text-zinc-600 text-xs mt-1">+15% aplicado agora</div>
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">Receita extra estimada</div>
          <div className="text-green-400 text-2xl font-bold">+R$ 840</div>
          <div className="text-zinc-500 text-xs mt-1">este mês com precificação dinâmica</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* Preços por serviço */}
        <div>
          <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Preços por serviço</div>
          <div className="space-y-2">
            {servicosMock.map((s) => {
              const demanda = demandaConfig[s.demanda]
              const precoAtual = Math.round(s.precoBase * (1 + s.ajuste / 100))
              return (
                <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-white text-sm font-medium">{s.nome}</div>
                      <div className={`text-xs ${demanda.style}`}>
                        Demanda {demanda.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-zinc-500 text-xs line-through">R$ {s.precoBase}</div>
                      <div className={`text-lg font-bold ${s.ajuste > 0 ? "text-red-400" : s.ajuste < 0 ? "text-green-400" : "text-white"}`}>
                        R$ {precoAtual}
                      </div>
                      {s.ajuste !== 0 && (
                        <div className={`text-xs ${s.ajuste > 0 ? "text-red-400" : "text-green-400"}`}>
                          {s.ajuste > 0 ? "+" : ""}{s.ajuste}%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${demanda.barColor}`} style={{ width: `${demanda.pct}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-600 mt-1">
                    <span>Min: R$ {s.precoMin}</span>
                    <span>Max: R$ {s.precoMax}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Regras de ajuste */}
        <div>
          <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Regras de ajuste automático</div>
          <div className="space-y-2">
            {regrasState.map((regra) => (
              <div
                key={regra.id}
                className={`bg-zinc-900 border rounded-xl p-4 transition-all ${regra.ativa ? "border-zinc-700" : "border-zinc-800 opacity-60"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => toggleRegra(regra.id)}
                    className={`w-10 h-6 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${regra.ativa ? "bg-amber-500" : "bg-zinc-700"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${regra.ativa ? "left-5" : "left-1"}`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{regra.nome}</span>
                      <span className={`text-xs font-bold font-mono ${regra.ajuste.startsWith("+") ? "text-red-400" : "text-green-400"}`}>
                        {regra.ajuste}
                      </span>
                    </div>
                    <div className="text-zinc-500 text-xs">{regra.descricao}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 mt-3">
            <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-2">⬡ Como funciona</div>
            <div className="text-zinc-400 text-sm leading-relaxed">
              A IA monitora a demanda em tempo real e ajusta os preços automaticamente dentro dos limites mínimo e máximo que você configurou. O cliente vê sempre o preço final já ajustado.
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  )
}