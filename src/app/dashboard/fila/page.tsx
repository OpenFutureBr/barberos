"use client"

import { useState, useEffect, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

type Appt = {
  id: string
  status: string
  scheduledAt: string
  client: { name: string; phone: string }
  service: { name: string; price: number; durationMin?: number }
  professional: { name: string }
  payment: { id: string } | null
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function minutosAte(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000)
}

function minutosDesde(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000)
}

const STATUS_FILA = ["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"]

export default function FilaPage() {
  const [appts, setAppts] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // Tick a cada segundo para atualizar timers
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAppts = useCallback(() => {
    fetch("/api/pix/cobrancas")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const filtrados = d
            .filter((a: Appt) => STATUS_FILA.includes(a.status))
            .sort((a: Appt, b: Appt) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          setAppts(filtrados)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAppts() }, [fetchAppts])

  // Recarrega a cada 30 segundos
  useEffect(() => {
    const t = setInterval(fetchAppts, 30000)
    return () => clearInterval(t)
  }, [fetchAppts])

  // Escuta pagamento confirmado para recarregar
  useEffect(() => {
    window.addEventListener("pagamentoConfirmado", fetchAppts)
    return () => window.removeEventListener("pagamentoConfirmado", fetchAppts)
  }, [fetchAppts])

  const emAtendimento = appts.find(a => a.status === "IN_PROGRESS")
    ?? appts.find(a => minutosDesde(a.scheduledAt) >= 0 && a.status !== "IN_PROGRESS")

  const fila = appts.filter(a => a.id !== emAtendimento?.id)

  // Timer do em atendimento
  const duracaoMin = emAtendimento?.service?.durationMin ?? 30
  const elapsedMin = emAtendimento ? minutosDesde(emAtendimento.scheduledAt) : 0
  const elapsedSeg = emAtendimento ? Math.round((Date.now() - new Date(emAtendimento.scheduledAt).getTime()) / 1000) : 0
  const restanteSeg = Math.max(0, duracaoMin * 60 - elapsedSeg)
  const restanteMin = Math.floor(restanteSeg / 60)
  const restanteSec = restanteSeg % 60
  const progresso = Math.min(100, (elapsedSeg / (duracaoMin * 60)) * 100)

  const esperaMedia = fila.length > 0
    ? Math.round(fila.reduce((s, a) => s + Math.max(0, minutosAte(a.scheduledAt)), 0) / fila.length)
    : 0

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Fila de Espera</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-zinc-500 text-sm">
              {loading ? "Carregando..." : `${fila.length} aguardando${esperaMedia > 0 ? ` · espera média ${esperaMedia} min` : ""} · ao vivo`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("abrirModalAgenda"))}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Agendar
          </button>
          <a href="/dashboard/painel-tv" target="_blank" rel="noopener noreferrer"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors flex items-center gap-1.5">
            <span className="text-base leading-none">▣</span> Painel TV
          </a>
        </div>
      </div>

      {/* Em atendimento */}
      {emAtendimento ? (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold flex-shrink-0">
                {emAtendimento.client.name.charAt(0)}
              </div>
              <div>
                <div className="text-xs text-amber-400 font-mono uppercase tracking-widest mb-0.5">Em atendimento agora</div>
                <div className="text-white font-bold text-base">{emAtendimento.client.name}</div>
                <div className="text-zinc-400 text-sm">
                  {emAtendimento.service.name} · {emAtendimento.professional.name} · início {fmtHora(emAtendimento.scheduledAt)}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-zinc-500 mb-1">Tempo restante</div>
              <div className="text-amber-400 font-bold text-2xl font-mono">
                {String(restanteMin).padStart(2, "0")}:{String(restanteSec).padStart(2, "0")}
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${progresso}%` }} />
          </div>
        </div>
      ) : !loading && appts.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-4 text-center text-zinc-600 text-sm">
          Nenhum agendamento para hoje
        </div>
      ) : null}

      {/* Fila */}
      {fila.length > 0 && (
        <>
          <div className="grid grid-cols-5 gap-3 px-3 mb-2 text-xs text-zinc-600 font-mono uppercase tracking-widest">
            <span>Pos.</span>
            <span className="col-span-2">Cliente</span>
            <span>Horário</span>
            <span>Espera</span>
          </div>

          <div className="space-y-2">
            {fila.map((item, idx) => {
              const mins = minutosAte(item.scheduledAt)
              const isProximo = idx === 0
              return (
                <div key={item.id}
                  className={`grid grid-cols-5 gap-3 p-3 rounded-xl border items-center transition-all ${
                    isProximo ? "bg-amber-500/5 border-amber-500/25" : "bg-zinc-900 border-zinc-800"
                  }`}>

                  {/* Posição */}
                  <div className={`font-bold text-lg font-mono ${isProximo ? "text-amber-400" : "text-zinc-600"}`}>
                    {idx + 1}º
                  </div>

                  {/* Cliente */}
                  <div className="col-span-2 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {item.client.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{item.client.name}</div>
                      <div className="text-zinc-500 text-xs truncate">
                        {item.service.name} · {item.professional.name}
                      </div>
                    </div>
                  </div>

                  {/* Horário */}
                  <div className="text-zinc-400 text-sm font-mono">{fmtHora(item.scheduledAt)}</div>

                  {/* Espera */}
                  <div>
                    {mins > 0 ? (
                      <span className="text-zinc-400 text-xs font-mono">~{mins} min</span>
                    ) : mins === 0 ? (
                      <span className="text-green-400 text-xs font-semibold">Agora</span>
                    ) : (
                      <span className="text-amber-400 text-xs font-semibold">{Math.abs(mins)} min atraso</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Rodapé */}
      <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <span className="text-zinc-500 text-xs">Atualiza automaticamente a cada 30s</span>
        </div>
        <button onClick={fetchAppts} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
          Atualizar agora
        </button>
      </div>

    </DashboardLayout>
  )
}
