"use client"

import { useState, useEffect } from "react"

const atendimentoAtual = {
  cliente: "Carlos Andrade",
  servico: "Corte + Barba",
  profissional: "Lucas Carvalho",
  inicio: "13:48",
  duracaoMin: 45,
}

const filaMock = [
  { pos: 1, cliente: "João Ribeiro", servico: "Corte + Barba", espera: 12 },
  { pos: 2, cliente: "Roberto Maia", servico: "Corte", espera: 25 },
  { pos: 3, cliente: "Tiago Nunes", servico: "Barba", espera: 35 },
  { pos: 4, cliente: "Paulo Azevedo", servico: "Corte + Barba", espera: 55 },
]

const promocoes = [
  { id: "1", texto: "☕ Aproveite nosso café cortesia enquanto aguarda!", cor: "text-amber-400" },
  { id: "2", texto: "💈 Plano Barba por R$ 60/mês — serviço ilimitado!", cor: "text-green-400" },
  { id: "3", texto: "📱 Agende pelo WhatsApp e ganhe 5% de cashback!", cor: "text-blue-400" },
  { id: "4", texto: "★ Programa VIP — acumule pontos a cada visita!", cor: "text-purple-400" },
]

export default function PainelTVPage() {
  const [hora, setHora] = useState("")
  const [data, setData] = useState("")
  const [promoAtual, setPromoAtual] = useState(0)
  const [segundos, setSegundos] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => {
      const agora = new Date()
      setHora(agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
      setData(agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))
      setSegundos(s => s + 1)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const promo = setInterval(() => {
      setPromoAtual(p => (p + 1) % promocoes.length)
    }, 5000)
    return () => clearInterval(promo)
  }, [])

  const tempoRestante = Math.max(0, atendimentoAtual.duracaoMin - Math.floor(segundos / 60))

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6" style={{position:"relative"}}>
       <a href="/dashboard" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors">
          ← Voltar
        </a>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <span className="text-black font-bold text-lg">B</span>
          </div>
          <div>
            <div className="text-white font-bold text-xl tracking-tight">Barbearia Costa</div>
            <div className="text-zinc-500 text-sm">Vila Madalena · São Paulo</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white font-bold text-3xl font-mono">{hora}</div>
          <div className="text-zinc-500 text-sm capitalize">{data}</div>
        </div>
      </div>

      <div className="flex gap-6 flex-1">

        {/* Coluna esquerda — Em atendimento + Fila */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Em atendimento agora */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-3">
              ✂️ Em atendimento agora
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-2xl font-bold mb-1">{atendimentoAtual.cliente}</div>
                <div className="text-zinc-400">{atendimentoAtual.servico} · {atendimentoAtual.profissional}</div>
              </div>
              <div className="text-right">
                <div className="text-zinc-500 text-sm mb-1">Tempo restante</div>
                <div className="text-amber-400 text-4xl font-bold font-mono">
                  {String(tempoRestante).padStart(2, "0")}min
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (Math.floor(segundos / 60) / atendimentoAtual.duracaoMin) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Fila de espera */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex-1">
            <div className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-4">
              ⏱ Fila de espera
            </div>
            <div className="space-y-3">
              {filaMock.map((item) => (
                <div
                  key={item.pos}
                  className={`flex items-center gap-4 p-3 rounded-xl ${
                    item.pos === 1 ? "bg-amber-500/10 border border-amber-500/20" : "bg-zinc-800"
                  }`}
                >
                  <div className={`text-2xl font-bold font-mono w-8 ${item.pos === 1 ? "text-amber-400" : "text-zinc-600"}`}>
                    {item.pos}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{item.cliente}</div>
                    <div className="text-zinc-500 text-sm">{item.servico}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-500 text-xs mb-0.5">Espera aprox.</div>
                    <div className={`font-bold text-lg ${item.pos === 1 ? "text-amber-400" : "text-zinc-300"}`}>
                      ~{item.espera} min
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita — Info + Promoções */}
        <div className="w-80 flex flex-col gap-4">

          {/* Total na fila */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <div className="text-zinc-500 text-sm mb-2">Aguardando atendimento</div>
            <div className="text-white text-6xl font-bold mb-1">{filaMock.length}</div>
            <div className="text-zinc-600 text-sm">clientes na fila</div>
          </div>

          {/* Promoção rotativa */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col justify-center">
            <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-4 text-center">
              Aproveite sua espera
            </div>
            <div className="text-center">
              <div className={`text-lg font-medium leading-relaxed transition-all duration-500 ${promocoes[promoAtual].cor}`}>
                {promocoes[promoAtual].texto}
              </div>
            </div>
            {/* Indicadores */}
            <div className="flex justify-center gap-2 mt-6">
              {promocoes.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${i === promoAtual ? "bg-amber-500" : "bg-zinc-700"}`}
                ></div>
              ))}
            </div>
          </div>

          {/* QR Code agendamento */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-3">
              Agende pelo celular
            </div>
            <div className="w-20 h-20 bg-white rounded-xl mx-auto mb-3 flex items-center justify-center">
              <div className="grid grid-cols-5 gap-0.5 p-1">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-sm ${
                      [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,7,12,17].includes(i)
                        ? "bg-zinc-900" : "bg-white"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-amber-400 text-xs font-mono">barberos.com/barbearia-costa</div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-zinc-600 text-xs">Atualização em tempo real · BarberOS</span>
        </div>
        <div className="text-zinc-700 text-xs font-mono">PRD v1.3 · content_slots[] ready</div>
      </div>

    </div>
  )
}