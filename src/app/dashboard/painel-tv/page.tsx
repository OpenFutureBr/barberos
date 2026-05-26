"use client"

import { useState, useEffect, useCallback } from "react"

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
  // Usa startedAt se disponível (momento exato que foi marcado Em andamento), senão scheduledAt
  const base = startedAt ?? scheduledAt
  useEffect(() => {
    function calc() {
      const elapsed = Math.max(0, Math.round((Date.now() - new Date(base).getTime()) / 1000))
      setSeg(elapsed)
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

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-500 text-xs">Restante</span>
        <span className="text-amber-400 font-bold text-sm font-mono">{String(rm).padStart(2, "0")}:{String(rs).padStart(2, "0")}</span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${progresso}%` }} />
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

  // Relógio
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date()
      setHoraStr(n.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
      setDataStr(n.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Configurações: playlist ativa + slots — re-busca a cada 30s para detectar mudança de playlist
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

  // Rotação dos slots de conteúdo
  useEffect(() => {
    if (slots.length <= 1) return
    const duracao = (slots[slotAtivo]?.duracao ?? 15) * 1000
    const t = setTimeout(() => setSlotAtivo(i => (i + 1) % slots.length), duracao)
    return () => clearTimeout(t)
  }, [slotAtivo, slots])

  // "Atendimento agora" — atualiza a cada 10 segundos
  const fetchAgora = useCallback(() => {
    fetch("/api/painel-tv/agora")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBarbeiros(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchAgora() }, [fetchAgora])
  useEffect(() => {
    const t = setInterval(fetchAgora, 10000)
    return () => clearInterval(t)
  }, [fetchAgora])

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

        {/* Relógio */}
        <div className="text-center absolute left-1/2 -translate-x-1/2">
          <div className="text-white font-bold text-2xl font-mono tracking-wider">{horaStr}</div>
          <div className="text-zinc-500 text-xs capitalize">{dataStr}</div>
        </div>

        {/* Indicador de atualização */}
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

        {/* Atendimento agora — lado direito */}
        <div className="flex flex-col gap-3 flex-shrink-0 overflow-y-auto" style={{ width: "38%" }}>
          <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest flex-shrink-0">
            Atendimento agora
          </div>

          {barbeiros.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-600 text-sm flex-shrink-0">
              Nenhum atendimento no momento
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1">
              {barbeiros.map(b => {
                const emAndamento = b.appt?.status === "IN_PROGRESS"
                return (
                  <div key={b.id}
                    className={`rounded-2xl p-4 border flex-shrink-0 ${
                      emAndamento
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-red-500/5 border-red-500/15 opacity-70"
                    }`}>
                    {/* Cabeçalho: barbeiro */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        emAndamento ? "bg-amber-500 text-black" : "bg-red-900/60 text-red-300"
                      }`}>
                        {b.name.charAt(0)}
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${
                        emAndamento ? "text-amber-400" : "text-red-400/70"
                      }`}>{b.name}</span>
                      {emAndamento && (
                        <span className="ml-auto text-xs text-amber-500 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                          Em andamento
                        </span>
                      )}
                      {!emAndamento && (
                        <span className="ml-auto text-xs text-red-400/50 font-mono">{fmtHora(b.appt!.scheduledAt)}</span>
                      )}
                    </div>

                    {/* Dados do cliente */}
                    {b.appt && (
                      <>
                        <div className={`font-bold text-base leading-tight truncate ${
                          emAndamento ? "text-white" : "text-red-200/50"
                        }`}>{b.appt.client.name}</div>

                        {/* Timer só para em andamento */}
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

      {/* ── SLOT DE CONTEÚDO (20vh) ── */}
      <div className="flex-shrink-0 px-6 pb-4" style={{ height: "20vh" }}>
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
            <div className={`h-full border rounded-2xl ${cls} flex flex-col items-center justify-center text-center px-8 gap-2`}>
              {s.titulo && <div className={`text-2xl font-bold ${txt}`}>{s.titulo}</div>}
              {s.texto && <div className="text-zinc-300 text-base leading-relaxed">{s.texto}</div>}
              {slots.length > 1 && (
                <div className="flex gap-1 mt-2">
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
  )
}
