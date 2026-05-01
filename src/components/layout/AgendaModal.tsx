"use client"

import { useState, useEffect, useRef } from "react"

function gerarSlots(inicio = "08:00", fim = "18:00", intervaloMin = 30) {
  const slots: string[] = []
  const [hI, mI] = inicio.split(":").map(Number)
  const [hF, mF] = fim.split(":").map(Number)
  let totalMin = hI * 60 + mI
  const fimMin = hF * 60 + mF
  while (totalMin <= fimMin) {
    const h = String(Math.floor(totalMin / 60)).padStart(2, "0")
    const m = String(totalMin % 60).padStart(2, "0")
    slots.push(`${h}:${m}`)
    totalMin += intervaloMin
  }
  return slots
}

const horas = gerarSlots("08:00", "18:00", 10)
const DESCANSO_MIN = 10

function adicionarMinutos(data: Date, minutos: number) {
  return new Date(data.getTime() + minutos * 60 * 1000)
}

function getDataSaoPaulo(data: Date) {
  return data.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

function getDataHoraInicial() {
  const agoraMais5 = adicionarMinutos(new Date(), 5)
  const hoje = getDataSaoPaulo(agoraMais5)
  const primeiraHora = horas.find((h) => new Date(`${hoje}T${h}:00-03:00`) > agoraMais5)
  if (primeiraHora) return { data: hoje, hora: primeiraHora }
  return { data: getDataSaoPaulo(adicionarMinutos(agoraMais5, 24 * 60)), hora: horas[0] }
}

type Props = {
  aberto: boolean
  onFechar: () => void
  dadosPreCarregados: {
    profissionais: any[]
    clientes: any[]
    servicos: any[]
  } | null
}

function WheelPicker({ items, value, onChange }: {
  items: string[]
  value: string
  onChange: (val: string) => void
}) {
  const ITEM_H = 40
  const PAD = 2
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const currentIdx = Math.max(0, items.indexOf(value))
  const startRef = useRef({ y: 0, idx: 0 })
  const dragging = useRef(false)

  function scrollTo(idx: number) {
    const clamped = Math.max(0, Math.min(items.length - 1, idx))
    onChange(items[clamped])
  }

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.style.transform = `translateY(${-currentIdx * ITEM_H}px)`
    }
  }, [currentIdx])

  // Fix: adiciona wheel listener manualmente com passive: false
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      scrollTo(currentIdx + (e.deltaY > 0 ? 1 : -1))
    }
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [currentIdx, items])

  return (
    <div
      ref={outerRef}
      style={{ width: 80, height: 160, overflow: "hidden", position: "relative", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", cursor: "grab", userSelect: "none" }}
      onMouseDown={e => { dragging.current = true; startRef.current = { y: e.clientY, idx: currentIdx } }}
      onMouseMove={e => { if (!dragging.current) return; const d = Math.round((startRef.current.y - e.clientY) / ITEM_H); scrollTo(startRef.current.idx + d) }}
      onMouseUp={() => dragging.current = false}
      onMouseLeave={() => dragging.current = false}
      onTouchStart={e => { startRef.current = { y: e.touches[0].clientY, idx: currentIdx } }}
      onTouchMove={e => { const d = Math.round((startRef.current.y - e.touches[0].clientY) / ITEM_H); scrollTo(startRef.current.idx + d) }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, background: "linear-gradient(to bottom, #18181b, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 56, background: "linear-gradient(to top, #18181b, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: 8, right: 8, height: 40, transform: "translateY(-50%)", borderTop: "1px solid #52525b", borderBottom: "1px solid #52525b", zIndex: 1, pointerEvents: "none" }} />
      <div ref={innerRef} style={{ display: "flex", flexDirection: "column", transform: `translateY(${-currentIdx * ITEM_H}px)` }}>
        {[...Array(PAD)].map((_, i) => <div key={`t${i}`} style={{ height: ITEM_H }} />)}
        {items.map((item) => (
          <div key={item} style={{ height: ITEM_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: item === value ? 22 : 16, fontWeight: item === value ? 600 : 400, color: item === value ? "#fff" : "#52525b", flexShrink: 0 }}>
            {item}
          </div>
        ))}
        {[...Array(PAD)].map((_, i) => <div key={`b${i}`} style={{ height: ITEM_H }} />)}
      </div>
    </div>
  )
}

export default function AgendaModal({ aberto, onFechar, dadosPreCarregados }: Props) {
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const inicial = getDataHoraInicial()
  const hojeISO = getDataSaoPaulo(new Date())
  const maxDataISO = getDataSaoPaulo(adicionarMinutos(new Date(), 5 * 24 * 60))

  const [dataSelecionada, setDataSelecionada] = useState(inicial.data)
  const [hora, setHora] = useState(inicial.hora)
  const [clienteId, setClienteId] = useState("")
  const [servicoId, setServicoId] = useState("")
  const [profId, setProfId] = useState("")
  const [tipoAtendimento, setTipoAtendimento] = useState("presencial")

  const servicoSelecionado = servicos.find((s) => s.id === servicoId)
  const duracaoTotal = (servicoSelecionado?.durationMin || 30) + DESCANSO_MIN

  const horariosDisponiveis = horas.filter((h) => {
    const inicioNovo = new Date(`${dataSelecionada}T${h}:00-03:00`)
    const fimNovo = adicionarMinutos(inicioNovo, duracaoTotal)
    const agoraMais5 = adicionarMinutos(new Date(), 5)
    if (inicioNovo <= agoraMais5) return false
    if (!profId || !servicoId) return true
    const temConflito = agendamentos.some((a) => {
      if (a.professionalId !== profId) return false
      if (a.status === "CANCELLED" || a.status === "NO_SHOW") return false
      const inicioExistente = new Date(a.scheduledAt)
      const fimExistente = adicionarMinutos(inicioExistente, (a.service?.durationMin || 30) + DESCANSO_MIN)
      return inicioNovo < fimExistente && fimNovo > inicioExistente
    })
    return !temConflito
  })

    useEffect(() => {
    if (!aberto) return
    if (dadosPreCarregados) {
      // Usa dados já carregados — sem delay
      setProfissionais(dadosPreCarregados.profissionais)
      setClientes(dadosPreCarregados.clientes)
      setServicos(dadosPreCarregados.servicos)
      setCarregando(false)
    } else {
      // Fallback: busca se ainda não carregou
      setCarregando(true)
      Promise.all([
        fetch("/api/equipe").then(r => r.json()),
        fetch("/api/clientes").then(r => r.json()),
        fetch("/api/servicos").then(r => r.json()),
        fetch(`/api/agendamentos?data=${dataSelecionada}`).then(r => r.json()),
      ]).then(([profs, cls, svcs, appts]) => {
        setProfissionais(Array.isArray(profs) ? profs : [])
        setClientes(Array.isArray(cls) ? cls : [])
        setServicos(Array.isArray(svcs) ? svcs : [])
        setAgendamentos(Array.isArray(appts) ? appts : [])
      }).catch(console.error)
      .finally(() => setCarregando(false))
    }
  }, [aberto])

  // Escuta clique em slot vazio vindo da grade da agenda
  useEffect(() => {
    function handleSlotEvento(e: Event) {
      const { hora, profId, data } = (e as CustomEvent).detail
      setHora(hora)
      setProfId(profId)
      setDataSelecionada(data)
    }
    window.addEventListener("abrirModalAgenda", handleSlotEvento)
    return () => window.removeEventListener("abrirModalAgenda", handleSlotEvento)
  }, [])

  useEffect(() => {
    setServicoId("")
  }, [tipoAtendimento])

  useEffect(() => {
    if (horariosDisponiveis.length > 0 && !horariosDisponiveis.includes(hora)) {
      setHora(horariosDisponiveis[0])
    }
  }, [dataSelecionada, horariosDisponiveis, hora])

  function resetar() {
    const i = getDataHoraInicial()
    setDataSelecionada(i.data)
    setHora(i.hora)
    setClienteId("")
    setServicoId("")
    setProfId("")
    setTipoAtendimento("presencial")
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const scheduledAt = new Date(`${dataSelecionada}T${hora}:00-03:00`)
      const payload = {
        clientId: clienteId,
        professionalId: profId,
        serviceId: servicoId,
        scheduledAt: scheduledAt.toISOString(),
        serviceType: tipoAtendimento === "domicilio" ? "HOME_VISIT" : "PRESENTIAL",
      }
      const response = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        alert(result.error || "Erro ao criar agendamento")
        return
      }
      resetar()
      window.dispatchEvent(new CustomEvent("agendamentoSalvo"))
      onFechar()
    } catch (e) {
      console.error(e)
      alert("Erro inesperado ao criar agendamento")
    } finally {
      setSalvando(false)
    }
  }

  const servicosFiltrados = servicos.filter((s) =>
    tipoAtendimento === "domicilio" ? s.availableHome === true : true
  )

  if (!aberto) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-bold">Novo Agendamento</h2>
          <button onClick={onFechar} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {carregando ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
        ) : (
          <form onSubmit={handleSalvar} className="p-5 space-y-3">
            {profId && hora && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400 text-sm">
                ◈ {hora} · {profissionais.find(p => p.id === profId)?.name}
              </div>
            )}
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Tipo de atendimento</label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setTipoAtendimento("presencial")}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    tipoAtendimento === "presencial" ? "border-amber-500/30 bg-amber-500/10" : "border-zinc-700 bg-zinc-800"
                  }`}
                >
                  <span className={`text-xs font-medium ${tipoAtendimento === "presencial" ? "text-amber-400" : "text-zinc-400"}`}>
                    🏪 Presencial
                  </span>
                </div>
                <div
                  onClick={() => setTipoAtendimento("domicilio")}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    tipoAtendimento === "domicilio" ? "border-teal-500/30 bg-teal-500/10" : "border-zinc-700 bg-zinc-800"
                  }`}
                >
                  <span className={`text-xs font-medium ${tipoAtendimento === "domicilio" ? "text-teal-400" : "text-zinc-400"}`}>
                    🚗 Domicílio
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Cliente *</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                <option value="">Selecionar cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Profissional *</label>
              <select value={profId} onChange={(e) => setProfId(e.target.value)} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                <option value="">Selecionar profissional...</option>
                {profissionais.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Serviço *</label>
              <select value={servicoId} onChange={(e) => setServicoId(e.target.value)} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                <option value="">Selecionar serviço...</option>
                {servicosFiltrados.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — R$ {s.price} · {s.durationMin}min</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Data *</label>
              <input type="date" value={dataSelecionada} min={hojeISO} max={maxDataISO}
                onChange={(e) => setDataSelecionada(e.target.value)} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
            </div>
            
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Horário *</label>
              {horariosDisponiveis.length === 0 ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
                  Não há horários disponíveis para esta data, profissional e serviço.
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <WheelPicker
                      items={[...new Set(horariosDisponiveis.map(h => h.split(":")[0]))]}
                      value={hora.split(":")[0]}
                      onChange={(h) => {
                        const mins = horariosDisponiveis.filter(s => s.startsWith(h + ":")).map(s => s.split(":")[1])
                        const newMin = mins.includes(hora.split(":")[1]) ? hora.split(":")[1] : mins[0]
                        setHora(`${h}:${newMin ?? "00"}`)
                      }}
                    />
                    <span className="text-white text-2xl font-bold">:</span>
                    <WheelPicker
                      items={horariosDisponiveis.filter(s => s.startsWith(hora.split(":")[0] + ":")).map(s => s.split(":")[1])}
                      value={hora.split(":")[1]}
                      onChange={(m) => setHora(`${hora.split(":")[0]}:${m}`)}
                    />
                  </div>
                  <span className="text-amber-400 text-sm font-medium">{hora}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onFechar}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={salvando || horariosDisponiveis.length === 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}