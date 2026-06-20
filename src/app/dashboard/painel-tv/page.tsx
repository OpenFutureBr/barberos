"use client"

import { useState, useEffect, useCallback, useRef } from "react"

type BarbeiroAgora = {
  id: string
  name: string
  appt: {
    id: string
    status: string
    scheduledAt: string
    startedAt: string | null
    client: { name: string }
    service: { durationMin: number | null }
  } | null
}

type FilaItem = {
  id: string
  status: string
  scheduledAt: string
  client: { name: string }
  service: { name: string }
  professional: { name: string }
}

type Estab = { name: string; logoUrl: string | null; city: string | null; state: string | null }

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function buildIframeSrc(url: string): string | null {
  if (!url) return null
  const s = url.trim()
  const playlistMatch = s.match(/[?&]list=([a-zA-Z0-9_-]+)/) ?? (s.match(/^(PL[a-zA-Z0-9_-]+)$/) || null)
  if (playlistMatch) {
    return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}&autoplay=1&controls=1&rel=1&modestbranding=1&iv_load_policy=3&fs=1`
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) {
    return `https://www.youtube.com/embed/${s}?autoplay=1&controls=1&rel=1&modestbranding=1&iv_load_policy=3&fs=1`
  }
  const videoMatch = s.match(/(?:youtube\.com\/(?:.*[?&]v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (videoMatch) {
    return `https://www.youtube.com/embed/${videoMatch[1]}?autoplay=1&controls=1&rel=1&modestbranding=1&iv_load_policy=3&fs=1`
  }
  return null
}

function ElapsedTimer({ startedAt, scheduledAt, durationMin }: { startedAt: string | null; scheduledAt: string; durationMin: number | null }) {
  const [seg, setSeg] = useState(0)
  const base = startedAt ?? scheduledAt
  useEffect(() => {
    function calc() {
      setSeg(Math.max(0, Math.round((Date.now() - new Date(base).getTime()) / 1000)))
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [base])

  const dur = (durationMin ?? 30) * 60
  const restante = Math.max(0, dur - seg)
  const rm = Math.floor(restante / 60)
  const rs = restante % 60
  const progresso = Math.min(100, (seg / dur) * 100)
  const atrasado = restante === 0

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-600 text-xs">Restante</span>
        <span className={`font-bold text-xs font-mono ${atrasado ? "text-red-400" : "text-amber-400"}`}>
          {String(rm).padStart(2, "0")}:{String(rs).padStart(2, "0")}
        </span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${atrasado ? "bg-red-500" : "bg-amber-500"}`}
          style={{ width: `${progresso}%` }} />
      </div>
    </div>
  )
}

// Marquee vertical suave — itens duplicados para loop seamless
function FilaMarquee({ items }: { items: FilaItem[] }) {
  const SECS_PER_ITEM = 4
  const duration = items.length * SECS_PER_ITEM

  // Duplica para loop contínuo sem salto
  const doubled = [...items, ...items]

  return (
    <div className="h-full overflow-hidden relative">
      <style>{`
        @keyframes scrollQueue {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .fila-scroll {
          animation: scrollQueue ${duration}s linear infinite;
        }
        .fila-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="fila-scroll flex flex-col">
        {doubled.map((item, i) => {
          const pos = (i % items.length) + 1
          const isNaFila = item.status === "IN_QUEUE"
          return (
            <div key={`${item.id}-${i}`}
              className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800/50 flex-shrink-0">
              <span className={`font-mono text-sm w-6 flex-shrink-0 ${isNaFila ? "text-purple-400 font-bold" : "text-zinc-600"}`}>
                {pos}°
              </span>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isNaFila ? "bg-purple-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                {item.client.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate leading-tight">{item.client.name}</div>
                <div className="text-zinc-500 text-xs truncate">{item.service.name} · {item.professional.name}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-mono font-bold ${isNaFila ? "text-purple-300" : "text-zinc-400"}`}>
                  {fmtHora(item.scheduledAt)}
                </div>
                {isNaFila && (
                  <div className="text-purple-500 text-xs">Na fila</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PainelTVPage() {
  const [horaStr, setHoraStr] = useState("")
  const [dataStr, setDataStr] = useState("")
  const [estab, setEstab] = useState<Estab | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [slots, setSlots] = useState<{ id: string; type: string; titulo?: string; texto?: string; cor?: string; duracao: number; ativo: boolean }[]>([])
  const [slotAtivo, setSlotAtivo] = useState(0)
  const [barbeiros, setBarbeiros] = useState<BarbeiroAgora[]>([])
  const [filaEspera, setFilaEspera] = useState<FilaItem[]>([])

  // Relógio
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date()
      setHoraStr(n.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
      setDataStr(n.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Config
  const fetchConfig = useCallback(() => {
    fetch("/api/configuracoes").then(r => r.json()).then(d => {
      setEstab({ name: d.name ?? "BarberOS", logoUrl: d.logoUrl ?? null, city: d.city ?? null, state: d.state ?? null })
      const pc = d.painelConfig
      if (pc?.playlists?.length) {
        const idx = pc.playlistAtivaIdx ?? 0
        setYoutubeUrl(pc.playlists[idx]?.url ?? pc.playlists[0]?.url ?? "")
      } else {
        setYoutubeUrl("")
      }
      if (pc?.slots?.length) {
        setSlots(pc.slots.filter((s: any) => s.ativo))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchConfig()
    const t = setInterval(fetchConfig, 30000)
    function onLogo(e: Event) { setEstab(prev => prev ? { ...prev, logoUrl: (e as CustomEvent).detail } : prev) }
    function onEstab(e: Event) {
      const d = (e as CustomEvent).detail
      setEstab(prev => prev ? { ...prev, name: d.name ?? prev.name, logoUrl: d.logoUrl ?? prev.logoUrl } : prev)
    }
    window.addEventListener("logoAtualizada", onLogo)
    window.addEventListener("estabelecimentoAtualizado", onEstab)
    return () => {
      clearInterval(t)
      window.removeEventListener("logoAtualizada", onLogo)
      window.removeEventListener("estabelecimentoAtualizado", onEstab)
    }
  }, [fetchConfig])

  // Slots rotação
  useEffect(() => {
    if (slots.length <= 1) return
    const duracao = (slots[slotAtivo]?.duracao ?? 15) * 1000
    const t = setTimeout(() => setSlotAtivo(i => (i + 1) % slots.length), duracao)
    return () => clearTimeout(t)
  }, [slotAtivo, slots])

  // Barbeiros agora + fila de espera
  const fetchAgora = useCallback(() => {
    fetch("/api/painel-tv/agora")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBarbeiros(d) })
      .catch(() => {})
  }, [])

  const fetchFila = useCallback(() => {
    fetch("/api/pix/cobrancas")
      .then(r => r.json())
      .then((d: any[]) => {
        if (!Array.isArray(d)) return
        const espera = d
          .filter(a => ["SCHEDULED", "CONFIRMED", "IN_QUEUE"].includes(a.status))
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          .slice(0, 8)
        setFilaEspera(espera)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchAgora(); fetchFila() }, [fetchAgora, fetchFila])
  useEffect(() => {
    const t1 = setInterval(fetchAgora, 10000)
    const t2 = setInterval(fetchFila, 15000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [fetchAgora, fetchFila])

  const embedUrl = buildIframeSrc(youtubeUrl)

  return (
    <div className="bg-zinc-950 text-white overflow-hidden" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── HEADER (8vh) ── */}
      <header className="flex items-center justify-between px-8 border-b border-zinc-800/60 flex-shrink-0" style={{ height: "8vh" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-amber-500 flex items-center justify-center flex-shrink-0">
            {estab?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={estab.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-black font-bold text-lg">{estab?.name?.charAt(0) ?? "B"}</span>
            )}
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">{estab?.name ?? "BarberOS"}</div>
            {estab?.city && (
              <div className="text-zinc-500 text-xs">{estab.city}{estab.state ? ` · ${estab.state}` : ""}</div>
            )}
          </div>
        </div>

        <div className="text-center absolute left-1/2 -translate-x-1/2">
          <div className="text-white font-bold text-2xl font-mono tracking-wider">{horaStr}</div>
          <div className="text-zinc-500 text-xs capitalize">{dataStr}</div>
        </div>

        <div className="flex items-center gap-1.5 opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-600 text-xs">ao vivo</span>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL (72vh) ── */}
      <main className="flex gap-5 px-6 py-4 flex-shrink-0" style={{ height: "72vh" }}>

        {/* YouTube — lado esquerdo */}
        <div className="flex-1 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor"/>
              </svg>
              <div className="text-zinc-600 text-sm">Nenhuma playlist configurada</div>
              <div className="text-zinc-700 text-xs">Adicione e ative uma playlist em Configurações → Painel TV</div>
            </div>
          )}
        </div>

        {/* Atendimento agora — lado direito, 2 colunas */}
        <div className="flex flex-col gap-2 flex-shrink-0 overflow-hidden" style={{ width: "38%" }}>
          <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest flex-shrink-0 pb-0.5">
            Atendimento agora
          </div>

          {barbeiros.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center text-zinc-600 text-sm flex-shrink-0">
              Nenhum atendimento no momento
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 content-start">
              {barbeiros.map(b => {
                const emAndamento = b.appt?.status === "IN_PROGRESS"
                return (
                  <div key={b.id}
                    className={`rounded-xl p-3 border flex-shrink-0 ${
                      emAndamento
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-red-500/5 border-red-500/15 opacity-70"
                    }`}>
                    {/* Barbeiro */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        emAndamento ? "bg-amber-500 text-black" : "bg-red-900/60 text-red-300"
                      }`}>
                        {b.name.charAt(0)}
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wide truncate ${
                        emAndamento ? "text-amber-400" : "text-red-400/70"
                      }`}>{b.name.split(" ")[0]}</span>
                      {emAndamento && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                      )}
                      {!emAndamento && b.appt && (
                        <span className="ml-auto text-xs text-red-400/50 font-mono flex-shrink-0">{fmtHora(b.appt.scheduledAt)}</span>
                      )}
                    </div>

                    {/* Cliente */}
                    {b.appt && (
                      <>
                        <div className={`font-bold text-sm leading-tight truncate ${
                          emAndamento ? "text-white" : "text-red-200/50"
                        }`}>{b.appt.client.name}</div>

                        {emAndamento && (
                          <ElapsedTimer
                            startedAt={b.appt.startedAt}
                            scheduledAt={b.appt.scheduledAt}
                            durationMin={b.appt.service.durationMin}
                          />
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── BOTTOM (20vh) — fila rotativa ou slot de conteúdo ── */}
      <div className="flex-shrink-0 px-6 pb-4 flex gap-5" style={{ height: "20vh" }}>

        {/* Fila de espera (abaixo do YouTube) */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5 border-b border-zinc-800/60 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
              Próximos na fila
              {filaEspera.length > 0 && <span className="text-zinc-600 ml-2">({filaEspera.length})</span>}
            </span>
          </div>
          {filaEspera.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-700 text-sm">
              Nenhum na fila agora
            </div>
          ) : (
            <FilaMarquee items={filaEspera} />
          )}
        </div>

        {/* Slot de conteúdo (abaixo dos cards de barbeiro) */}
        <div className="flex-shrink-0 flex flex-col" style={{ width: "38%" }}>
          {slots.length > 0 && slots[slotAtivo] ? (() => {
            const s = slots[slotAtivo]
            const corMap: Record<string, string> = { amber: "border-amber-500/40 bg-amber-500/10", green: "border-green-500/40 bg-green-500/10", blue: "border-blue-500/40 bg-blue-500/10", red: "border-red-500/40 bg-red-500/10", purple: "border-purple-500/40 bg-purple-500/10" }
            const textoMap: Record<string, string> = { amber: "text-amber-300", green: "text-green-300", blue: "text-blue-300", red: "text-red-300", purple: "text-purple-300" }
            const cls = corMap[s.cor ?? "amber"] ?? corMap.amber
            const txt = textoMap[s.cor ?? "amber"] ?? textoMap.amber
            if (s.type === "fila") return (
              <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-2 opacity-30">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-zinc-600 text-xs">BarberOS · Painel TV</span>
                </div>
              </div>
            )
            return (
              <div className={`h-full border rounded-2xl ${cls} flex flex-col items-center justify-center text-center px-4 gap-1.5`}>
                {s.titulo && <div className={`text-lg font-bold ${txt}`}>{s.titulo}</div>}
                {s.texto && <div className="text-zinc-300 text-sm leading-relaxed">{s.texto}</div>}
                {slots.length > 1 && (
                  <div className="flex gap-1 mt-1">
                    {slots.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === slotAtivo ? "bg-white" : "bg-zinc-600"}`} />
                    ))}
                  </div>
                )}
              </div>
            )
          })() : (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-2 opacity-30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-zinc-600 text-xs">BarberOS · Painel TV</span>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
