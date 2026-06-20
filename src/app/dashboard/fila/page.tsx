"use client"

import { useState, useEffect, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

type Appt = {
  id: string
  status: string
  scheduledAt: string
  arrivedAt: string | null
  startedAt: string | null
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

// Componente de contador regressivo para um card de atendimento
function CountdownCard({ appt }: { appt: Appt }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const startMs = appt.startedAt
    ? new Date(appt.startedAt).getTime()
    : new Date(appt.scheduledAt).getTime()
  const duracaoMin = appt.service?.durationMin ?? 30
  const elapsedSeg = Math.round((now - startMs) / 1000)
  const totalSeg = duracaoMin * 60
  const restanteSeg = Math.max(0, totalSeg - elapsedSeg)
  const restanteMin = Math.floor(restanteSeg / 60)
  const restanteSec = restanteSeg % 60
  const progresso = Math.min(100, (elapsedSeg / totalSeg) * 100)
  const atrasado = restanteSeg === 0

  return (
    <div className={`rounded-xl p-4 border ${atrasado ? "bg-red-500/10 border-red-500/25" : "bg-amber-500/10 border-amber-500/25"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-base ${atrasado ? "bg-red-500/20 border border-red-500/30 text-red-400" : "bg-amber-500/20 border border-amber-500/30 text-amber-400"}`}>
            {appt.client.name.charAt(0)}
          </div>
          <div>
            <div className={`text-xs font-mono uppercase tracking-widest mb-0.5 ${atrasado ? "text-red-400" : "text-amber-400"}`}>
              {appt.professional.name}
            </div>
            <div className="text-white font-bold text-sm leading-tight">{appt.client.name}</div>
            <div className="text-zinc-400 text-xs">
              {appt.service.name} · início {fmtHora(appt.startedAt ?? appt.scheduledAt)}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <div className="text-xs text-zinc-500 mb-0.5">{atrasado ? "Em atraso" : "Restante"}</div>
          <div className={`font-bold text-xl font-mono ${atrasado ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
            {atrasado
              ? `+${String(Math.floor(elapsedSeg / 60 - duracaoMin)).padStart(2, "0")}:${String(elapsedSeg % 60).padStart(2, "0")}`
              : `${String(restanteMin).padStart(2, "0")}:${String(restanteSec).padStart(2, "0")}`}
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${atrasado ? "bg-red-500" : "bg-amber-500"}`}
          style={{ width: `${progresso}%` }} />
      </div>
    </div>
  )
}

export default function FilaPage() {
  const [appts, setAppts] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // Tick a cada 30 segundos para atualizar espera média
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000)
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

  useEffect(() => {
    const t = setInterval(fetchAppts, 30000)
    return () => clearInterval(t)
  }, [fetchAppts])

  useEffect(() => {
    window.addEventListener("pagamentoConfirmado", fetchAppts)
    return () => window.removeEventListener("pagamentoConfirmado", fetchAppts)
  }, [fetchAppts])

  // Todos em andamento (um por barbeiro potencialmente)
  const emAtendimento = appts.filter(a => a.status === "IN_PROGRESS")

  // Fila: todos que não estão em andamento
  const fila = appts.filter(a => a.status !== "IN_PROGRESS")

  // Espera média = só clientes IN_QUEUE, contando desde arrivedAt
  const naFila = fila.filter(a => a.status === "IN_QUEUE")
  const esperaMedia = naFila.length > 0
    ? Math.round(naFila.reduce((s, a) => s + minutosDesde(a.arrivedAt ?? a.scheduledAt), 0) / naFila.length)
    : null

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Fila de Espera</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-zinc-500 text-sm">
              {loading
                ? "Carregando..."
                : [
                    emAtendimento.length > 0 && `${emAtendimento.length} em atendimento`,
                    fila.length > 0 && `${fila.length} aguardando`,
                    esperaMedia !== null && `espera média ${esperaMedia} min`,
                  ].filter(Boolean).join(" · ") + " · ao vivo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/dashboard/painel-tv" target="_blank" rel="noopener noreferrer"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors flex items-center gap-1.5">
            <span className="text-base leading-none">▣</span> Painel TV
          </a>
        </div>
      </div>

      {/* Em atendimento — grid por barbeiro */}
      {emAtendimento.length > 0 ? (
        <div className="mb-5">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2 px-0.5">Em atendimento agora</p>
          <div className={`grid gap-3 ${emAtendimento.length === 1 ? "grid-cols-1" : emAtendimento.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {emAtendimento.map(a => <CountdownCard key={a.id} appt={a} />)}
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
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2 px-0.5">Aguardando</p>
          <div className="grid grid-cols-5 gap-3 px-3 mb-2 text-xs text-zinc-600 font-mono uppercase tracking-widest">
            <span>Pos.</span>
            <span className="col-span-2">Cliente</span>
            <span>Horário</span>
            <span>Espera</span>
          </div>

          <div className="space-y-2">
            {fila.map((item, idx) => {
              const mins = minutosAte(item.scheduledAt)
              const isNaFila = item.status === "IN_QUEUE"
              const esperandoMin = isNaFila ? minutosDesde(item.arrivedAt ?? item.scheduledAt) : null
              const isProximo = idx === 0
              return (
                <div key={item.id}
                  className={`grid grid-cols-5 gap-3 p-3 rounded-xl border items-center transition-all ${
                    isNaFila
                      ? "bg-purple-500/8 border-purple-500/25"
                      : isProximo
                        ? "bg-amber-500/5 border-amber-500/25"
                        : "bg-zinc-900 border-zinc-800"
                  }`}>

                  {/* Posição */}
                  <div className={`font-bold text-lg font-mono ${isNaFila ? "text-purple-400" : isProximo ? "text-amber-400" : "text-zinc-600"}`}>
                    {idx + 1}º
                  </div>

                  {/* Cliente */}
                  <div className="col-span-2 flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${isNaFila ? "bg-purple-700" : "bg-zinc-700"}`}>
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
                    {isNaFila ? (
                      <span className="text-purple-400 text-xs font-semibold">
                        {esperandoMin! <= 0 ? "Chegou agora" : `${esperandoMin} min esperando`}
                      </span>
                    ) : mins > 5 ? (
                      <span className="text-zinc-500 text-xs font-mono">~{mins} min</span>
                    ) : mins >= 0 ? (
                      <span className="text-green-400 text-xs font-semibold">Em breve</span>
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
