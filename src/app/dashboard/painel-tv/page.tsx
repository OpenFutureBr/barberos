"use client"

import { useState, useEffect, useCallback } from "react"

type Appt = {
  id: string
  status: string
  scheduledAt: string
  client: { name: string }
  service: { name: string; price: number; durationMin?: number }
  professional: { name: string }
  payment: { id: string } | null
}

type Estab = { name: string; logoUrl: string | null; city: string | null; state: string | null }

const STATUS_FILA = ["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"]

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function minutosAte(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000)
}

function buildIframeSrc(url: string): string | null {
  if (!url) return null
  const s = url.trim()

  // Playlist ID direto (PLxxxx) ou URL de playlist
  const playlistMatch = s.match(/[?&]list=([a-zA-Z0-9_-]+)/) ?? (s.match(/^(PL[a-zA-Z0-9_-]+)$/) || null)
  if (playlistMatch) {
    const listId = playlistMatch[1]
    return `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1&controls=1&rel=1&modestbranding=1&iv_load_policy=3&fs=1`
  }

  // Video ID direto (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) {
    return `https://www.youtube.com/embed/${s}?autoplay=1&controls=1&rel=1&modestbranding=1&iv_load_policy=3&fs=1`
  }

  // URL de vídeo
  const videoMatch = s.match(/(?:youtube\.com\/(?:.*[?&]v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (videoMatch) {
    const id = videoMatch[1]
    return `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=1&modestbranding=1&iv_load_policy=3&fs=1`
  }

  return null
}

export default function PainelTVPage() {
  const [horaStr, setHoraStr] = useState("")
  const [dataStr, setDataStr] = useState("")
  const [tick, setTick] = useState(0)
  const [estab, setEstab] = useState<Estab | null>(null)
  const [appts, setAppts] = useState<Appt[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [configModal, setConfigModal] = useState(false)
  const [playlists, setPlaylists] = useState<{ label: string; url: string }[]>([])
  const [playlistAtiva, setPlaylistAtiva] = useState(0)
  // Slots de conteúdo
  const [slots, setSlots] = useState<{ id: string; type: string; titulo?: string; texto?: string; cor?: string; duracao: number; ativo: boolean }[]>([])
  const [slotAtivo, setSlotAtivo] = useState(0)
  const [novaPlaylistLabel, setNovaPlaylistLabel] = useState("")
  const [novaPlaylistUrl, setNovaPlaylistUrl] = useState("")

  // Relógio
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date()
      setHoraStr(n.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
      setDataStr(n.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }))
      setTick(k => k + 1)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Dados do estabelecimento + painelConfig
  useEffect(() => {
    fetch("/api/configuracoes").then(r => r.json()).then(d => {
      setEstab({ name: d.name ?? "BarberOS", logoUrl: d.logoUrl ?? null, city: d.city ?? null, state: d.state ?? null })
      // Carrega playlists e slots da configuração
      if (d.painelConfig?.playlists?.length) {
        setPlaylists(d.painelConfig.playlists)
        setYoutubeUrl(d.painelConfig.playlists[0]?.url ?? "")
      }
      if (d.painelConfig?.slots?.length) {
        setSlots(d.painelConfig.slots.filter((s: any) => s.ativo))
      }
    }).catch(() => {})
    // Escuta atualização de logo
    function onLogo(e: Event) { setEstab(prev => prev ? { ...prev, logoUrl: (e as CustomEvent).detail } : prev) }
    function onEstab(e: Event) {
      const d = (e as CustomEvent).detail
      setEstab(prev => prev ? { ...prev, name: d.name ?? prev.name, logoUrl: d.logoUrl ?? prev.logoUrl } : prev)
    }
    window.addEventListener("logoAtualizada", onLogo)
    window.addEventListener("estabelecimentoAtualizado", onEstab)
    return () => { window.removeEventListener("logoAtualizada", onLogo); window.removeEventListener("estabelecimentoAtualizado", onEstab) }
  }, [])

  // Rotação dos slots de conteúdo
  useEffect(() => {
    if (slots.length <= 1) return
    const slot = slots[slotAtivo]
    const duracao = (slot?.duracao ?? 15) * 1000
    const t = setTimeout(() => setSlotAtivo(i => (i + 1) % slots.length), duracao)
    return () => clearTimeout(t)
  }, [slotAtivo, slots])

  // Fila de espera
  const fetchFila = useCallback(() => {
    fetch("/api/pix/cobrancas")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setAppts(
            d.filter((a: Appt) => STATUS_FILA.includes(a.status))
              .sort((a: Appt, b: Appt) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          )
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchFila() }, [fetchFila])
  useEffect(() => {
    const t = setInterval(fetchFila, 30000)
    return () => clearInterval(t)
  }, [fetchFila])

  function adicionarPlaylist() {
    if (!novaPlaylistUrl.trim()) return
    const nova = { label: novaPlaylistLabel.trim() || `Playlist ${playlists.length + 1}`, url: novaPlaylistUrl.trim() }
    const novas = [...playlists, nova]
    setPlaylists(novas)
    localStorage.setItem("painel_playlists", JSON.stringify(novas))
    setNovaPlaylistLabel("")
    setNovaPlaylistUrl("")
  }

  function removerPlaylist(idx: number) {
    const novas = playlists.filter((_, i) => i !== idx)
    setPlaylists(novas)
    localStorage.setItem("painel_playlists", JSON.stringify(novas))
    if (playlistAtiva >= novas.length) selecionarPlaylist(Math.max(0, novas.length - 1))
  }

  function selecionarPlaylist(idx: number) {
    setPlaylistAtiva(idx)
    setYoutubeUrl(playlists[idx]?.url ?? "")
    localStorage.setItem("painel_playlist_ativa", String(idx))
  }

  const embedUrl = buildIframeSrc(youtubeUrl)

  const emAtendimento = appts.find(a => a.status === "IN_PROGRESS")
    ?? (appts[0] && minutosAte(appts[0].scheduledAt) <= 0 ? appts[0] : undefined)

  const fila = appts.filter(a => a.id !== emAtendimento?.id)

  // Timer do atendimento atual
  const duracaoMin = emAtendimento?.service?.durationMin ?? 30
  const elapsedSeg = emAtendimento
    ? Math.max(0, Math.round((Date.now() - new Date(emAtendimento.scheduledAt).getTime()) / 1000))
    : 0
  const restanteSeg = Math.max(0, duracaoMin * 60 - elapsedSeg)
  const restMin = Math.floor(restanteSeg / 60)
  const restSec = restanteSeg % 60
  const progresso = Math.min(100, (elapsedSeg / (duracaoMin * 60)) * 100)

  return (
    <div className="bg-zinc-950 text-white overflow-hidden" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── HEADER (8vh) ── */}
      <header className="flex items-center justify-between px-8 border-b border-zinc-800/60 flex-shrink-0" style={{ height: "8vh" }}>
        {/* Logo + nome */}
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

        {/* Config */}
        <div className="flex items-center gap-2">
          <button onClick={() => setConfigModal(true)}
            className="text-zinc-600 hover:text-zinc-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
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
              <div className="text-zinc-600 text-sm">Nenhum vídeo configurado</div>
              <button onClick={() => setConfigModal(true)}
                className="text-amber-400 text-sm hover:text-amber-300 transition-colors underline">
                Configurar vídeo do YouTube
              </button>
            </div>
          )}
        </div>

        {/* Fila — lado direito */}
        <div className="flex flex-col gap-3 flex-shrink-0 overflow-y-auto" style={{ width: "38%" }}>

          {/* Em atendimento */}
          {emAtendimento ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex-shrink-0">
              <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-2">Em atendimento</div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white font-bold text-lg leading-tight truncate">{emAtendimento.client.name}</div>
                  <div className="text-zinc-400 text-sm">{emAtendimento.service.name}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">{emAtendimento.professional.name} · {fmtHora(emAtendimento.scheduledAt)}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-zinc-500 text-xs">Restante</div>
                  <div className="text-amber-400 font-bold text-xl font-mono">
                    {String(restMin).padStart(2, "0")}:{String(restSec).padStart(2, "0")}
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${progresso}%` }} />
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center text-zinc-600 text-sm flex-shrink-0">
              Nenhum atendimento em andamento
            </div>
          )}

          {/* Lista da fila */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex-1 overflow-y-auto">
            <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-3">
              Fila de espera · {fila.length} {fila.length === 1 ? "cliente" : "clientes"}
            </div>
            {fila.length === 0 ? (
              <div className="text-zinc-700 text-sm text-center py-4">Fila vazia</div>
            ) : (
              <div className="space-y-2">
                {fila.map((item, idx) => {
                  const mins = minutosAte(item.scheduledAt)
                  const isProximo = idx === 0
                  return (
                    <div key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${isProximo ? "bg-amber-500/8 border border-amber-500/20" : "bg-zinc-800/60"}`}>
                      <div className={`text-lg font-bold font-mono w-7 flex-shrink-0 ${isProximo ? "text-amber-400" : "text-zinc-600"}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm truncate">{item.client.name}</div>
                        <div className="text-zinc-500 text-xs truncate">{item.service.name} · {item.professional.name}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-zinc-500 text-xs font-mono">{fmtHora(item.scheduledAt)}</div>
                        <div className={`text-xs font-semibold ${mins > 0 ? "text-zinc-400" : "text-green-400"}`}>
                          {mins > 0 ? `~${mins} min` : "Agora"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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
              <span className="text-zinc-600 text-xs">BarberOS · Painel TV · configure slots em Configurações</span>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL CONFIGURAÇÃO DE PLAYLISTS ── */}
      {configModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-white font-bold">Playlists do YouTube</h2>
              <button onClick={() => setConfigModal(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">

              {/* Lista de playlists */}
              {playlists.length === 0 ? (
                <div className="text-zinc-600 text-sm text-center py-2">Nenhuma playlist cadastrada</div>
              ) : (
                <div className="space-y-2">
                  {playlists.map((p, idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-3 rounded-xl border transition-colors cursor-pointer ${
                      playlistAtiva === idx ? "bg-amber-500/10 border-amber-500/30" : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    }`} onClick={() => { selecionarPlaylist(idx); setConfigModal(false) }}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${playlistAtiva === idx ? "bg-amber-500" : "bg-zinc-600"}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${playlistAtiva === idx ? "text-amber-400" : "text-white"}`}>{p.label}</div>
                        <div className="text-zinc-600 text-xs truncate">{p.url}</div>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); removerPlaylist(idx) }}
                        className="text-zinc-700 hover:text-red-400 transition-colors text-sm flex-shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Adicionar nova */}
              <div className="border-t border-zinc-800 pt-4 space-y-2">
                <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Adicionar playlist</div>
                <input
                  value={novaPlaylistLabel}
                  onChange={e => setNovaPlaylistLabel(e.target.value)}
                  placeholder="Nome (ex: Trap, Lo-fi, Sertanejo)"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 placeholder:text-zinc-600"
                />
                <input
                  value={novaPlaylistUrl}
                  onChange={e => setNovaPlaylistUrl(e.target.value)}
                  placeholder="URL do YouTube (vídeo ou playlist)"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 placeholder:text-zinc-600"
                />
                {novaPlaylistUrl && !buildIframeSrc(novaPlaylistUrl) && (
                  <div className="text-red-400 text-xs">URL não reconhecida</div>
                )}
                <button onClick={adicionarPlaylist} disabled={!novaPlaylistUrl.trim() || !buildIframeSrc(novaPlaylistUrl)}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold py-2 rounded-lg text-sm transition-colors">
                  + Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
