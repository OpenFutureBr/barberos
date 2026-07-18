"use client"

import { useState, useEffect, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import CardCarousel from "@/components/ui/CardCarousel"

// ---- types ----
type ApptStatus = "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "NO_SHOW"

type Appt = {
  id: string
  scheduledAt: string
  status: ApptStatus
  clientAddress: string | null
  clientCity: string | null
  distanceKm: number | null
  travelFee: number | null
  client: { name: string; phone: string; homeAddress: string | null; homeCity: string | null; homeNumber: string | null; homeNeighborhood: string | null }
  service: { name: string; price: number }
  professional: { id: string; name: string }
}

type Zone = {
  serviceZoneKm: number | null
  serviceZoneAreas: string[]
  attendsHome: boolean
  bookingSlug: string | null
  name: string
}

type KitItem = {
  id: string
  name: string
  quantity: number
  minQuantity: number
  unit: string
  notes: string | null
}

// ---- helpers ----
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em rota",
  DONE: "Concluído",
}

const STATUS_CLS: Record<string, string> = {
  SCHEDULED: "bg-zinc-700 text-zinc-400 border-zinc-600",
  CONFIRMED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DONE: "bg-green-500/10 text-green-400 border-green-500/20",
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function enderecoCompleto(appt: Appt) {
  const addr = appt.clientAddress || [
    appt.client.homeAddress,
    appt.client.homeNumber,
    appt.client.homeNeighborhood,
  ].filter(Boolean).join(", ")
  const city = appt.clientCity || appt.client.homeCity
  return [addr, city].filter(Boolean).join(" — ") || "Endereço não informado"
}

// ---- componente NovoItemForm ----
function NovoItemForm({ onAdd }: { onAdd: (item: KitItem) => void }) {
  const [nome, setNome] = useState("")
  const [qty, setQty] = useState("0")
  const [min, setMin] = useState("1")
  const [unit, setUnit] = useState("un")
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    try {
      const res = await fetch("/api/domicilio/kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome.trim(), quantity: parseInt(qty) || 0, minQuantity: parseInt(min) || 1, unit: unit.trim() || "un" }),
      })
      if (!res.ok) return
      const novo = await res.json()
      onAdd(novo)
      setNome(""); setQty("0"); setMin("1"); setUnit("un")
    } finally { setSalvando(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-800 pt-4 mt-2">
      <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-3">Adicionar item</div>
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5">
          <label className="text-zinc-500 text-xs mb-1 block">Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Acetona"
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 placeholder:text-zinc-600" />
        </div>
        <div className="col-span-2">
          <label className="text-zinc-500 text-xs mb-1 block">Qtd</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0"
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 text-center" />
        </div>
        <div className="col-span-2">
          <label className="text-zinc-500 text-xs mb-1 block">Mín</label>
          <input type="number" value={min} onChange={e => setMin(e.target.value)} min="0"
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 text-center" />
        </div>
        <div className="col-span-2">
          <label className="text-zinc-500 text-xs mb-1 block">Unidade</label>
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="un"
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
        </div>
        <div className="col-span-1">
          <button type="submit" disabled={salvando || !nome.trim()}
            className="w-full h-[38px] bg-teal-500/20 hover:bg-teal-500/30 disabled:opacity-40 text-teal-400 rounded-lg border border-teal-500/20 text-lg font-bold transition-colors">
            +
          </button>
        </div>
      </div>
    </form>
  )
}

// ---- página ----
export default function DomicilioPage() {
  const [aba, setAba] = useState<"rota" | "kit" | "zona">("rota")
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [zone, setZone] = useState<Zone | null>(null)
  const [kitItems, setKitItems] = useState<KitItem[]>([])
  const [kitLoading, setKitLoading] = useState(false)
  const [kitLoaded, setKitLoaded] = useState(false)
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [salvandoQty, setSalvandoQty] = useState<string | null>(null)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [salvandoZona, setSalvandoZona] = useState(false)
  const [salvouZona, setSalvouZona] = useState(false)

  // zona form
  const [zonaKm, setZonaKm] = useState(10)
  const [zonaAreas, setZonaAreas] = useState("")
  const [attendsHome, setAttendsHome] = useState(false)

  const carregarRota = useCallback(() => {
    setLoading(true)
    fetch("/api/domicilio")
      .then(r => r.json())
      .then(d => {
        setAppointments(d.appointments ?? [])
        if (d.zone) {
          setZone(d.zone)
          setZonaKm(d.zone.serviceZoneKm ?? 10)
          setZonaAreas((d.zone.serviceZoneAreas ?? []).join(", "))
          setAttendsHome(d.zone.attendsHome ?? false)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const carregarKit = useCallback(() => {
    if (kitLoaded) return
    setKitLoading(true)
    fetch("/api/domicilio/kit")
      .then(r => r.json())
      .then(d => { setKitItems(Array.isArray(d) ? d : []); setKitLoaded(true) })
      .catch(console.error)
      .finally(() => setKitLoading(false))
  }, [kitLoaded])

  useEffect(() => { carregarRota() }, [carregarRota])
  useEffect(() => { if (aba === "kit") carregarKit() }, [aba, carregarKit])

  async function mudarStatus(apptId: string, novoStatus: string) {
    setAtualizando(apptId)
    try {
      const res = await fetch("/api/domicilio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: apptId, status: novoStatus }),
      })
      if (!res.ok) return
      setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: novoStatus as ApptStatus } : a))
    } finally { setAtualizando(null) }
  }

  async function ajustarQty(item: KitItem, delta: number) {
    const novaQty = Math.max(0, item.quantity + delta)
    setSalvandoQty(item.id)
    try {
      const res = await fetch(`/api/domicilio/kit/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: novaQty }),
      })
      if (!res.ok) return
      setKitItems(prev => prev.map(k => k.id === item.id ? { ...k, quantity: novaQty } : k))
    } finally { setSalvandoQty(null) }
  }

  async function deletarItem(id: string) {
    setDeletando(id)
    try {
      await fetch(`/api/domicilio/kit/${id}`, { method: "DELETE" })
      setKitItems(prev => prev.filter(k => k.id !== id))
    } finally { setDeletando(null) }
  }

  async function salvarZona(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoZona(true)
    try {
      const res = await fetch("/api/domicilio/zona", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendsHome, serviceZoneKm: zonaKm, serviceZoneAreas: zonaAreas }),
      })
      if (!res.ok) return
      const data = await res.json()
      setZone(prev => prev ? { ...prev, ...data } : data)
      setSalvouZona(true)
      setTimeout(() => setSalvouZona(false), 2500)
    } finally { setSalvandoZona(false) }
  }

  // derivados
  const concluidos = appointments.filter(a => a.status === "DONE").length
  const emRota = appointments.filter(a => a.status === "IN_PROGRESS").length
  const totalKm = appointments.reduce((s, a) => s + (a.distanceKm ?? 0), 0)
  const kitCritico = kitItems.filter(k => k.quantity < k.minQuantity).length

  return (
    <DashboardLayout>

      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Atendimento a Domicílio</h1>
          <p className="text-zinc-500 text-sm">Rota do dia · Kit pessoal · Zona de atendimento</p>
        </div>
        {zone?.name && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {zone.name}
          </span>
        )}
      </div>

      {/* KPIs — carrossel no mobile, grid no desktop (mesmo padrão do Dashboard) */}
      {(() => {
        const kpis = [
          <div key="rota" className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4 h-full">
            <div className="text-teal-400 text-xs font-mono uppercase tracking-widest mb-1">Rota de hoje</div>
            <div className="text-teal-400 text-2xl font-bold">{concluidos}/{appointments.length}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {emRota > 0 ? `${emRota} em rota agora` : "atendimentos concluídos"}
            </div>
          </div>,
          <div key="distancia" className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-full">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Distância total</div>
            <div className="text-white text-2xl font-bold">
              {totalKm > 0 ? `${totalKm.toFixed(1)} km` : "—"}
            </div>
            <div className="text-zinc-600 text-xs mt-1">percurso do dia</div>
          </div>,
          <div key="kit" className={`rounded-xl p-4 border h-full ${kitCritico > 0 ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800"}`}>
            <div className={`text-xs uppercase tracking-wide mb-1 ${kitCritico > 0 ? "text-red-400" : "text-zinc-500"}`}>
              {kitCritico > 0 ? "⚠ Kit crítico" : "Kit pessoal"}
            </div>
            <div className={`text-2xl font-bold ${kitCritico > 0 ? "text-red-400" : "text-green-400"}`}>
              {kitLoaded ? (kitCritico > 0 ? `${kitCritico} itens` : "OK") : "—"}
            </div>
            <div className="text-zinc-600 text-xs mt-1">
              {kitLoaded ? (kitCritico > 0 ? "abaixo do mínimo" : "todos os itens OK") : "carregue a aba Kit"}
            </div>
          </div>,
        ]
        return (
          <div className="mb-4">
            <CardCarousel cards={kpis} />
            <div className="hidden md:grid md:grid-cols-3 gap-3">{kpis}</div>
          </div>
        )
      })()}

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "rota", label: "Rota do dia" },
          { id: "kit", label: "Kit pessoal" },
          { id: "zona", label: "Zona de atendimento" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ABA ROTA ── */}
      {aba === "rota" && (
        <div className="space-y-3">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-40" />
                      <div className="h-3 bg-zinc-800 rounded w-56" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && appointments.length === 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <div className="text-zinc-600 text-4xl mb-3">🚗</div>
              <div className="text-white font-medium mb-1">Nenhum atendimento domicílio hoje</div>
              <div className="text-zinc-500 text-sm">Os agendamentos do tipo "a domicílio" aparecem aqui.</div>
            </div>
          )}

          {!loading && appointments.map((appt, idx) => {
            const isDone = appt.status === "DONE"
            const isEmRota = appt.status === "IN_PROGRESS"
            const isAgendado = appt.status === "SCHEDULED" || appt.status === "CONFIRMED"
            const carregando = atualizando === appt.id

            return (
              <div key={appt.id}
                className={`bg-zinc-900 border rounded-xl p-4 flex items-start gap-4 transition-all ${isEmRota ? "border-amber-500/30 bg-amber-500/3" : isDone ? "border-green-500/20 opacity-70" : "border-zinc-800"}`}>

                {/* ordem / status */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 ${isDone ? "bg-green-500 text-white" : isEmRota ? "bg-amber-500 text-black" : "bg-zinc-700 text-zinc-400"}`}>
                  {isDone ? "✓" : isEmRota ? "🚗" : idx + 1}
                </div>

                {/* dados */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white text-sm font-medium">{appt.client.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CLS[appt.status] ?? STATUS_CLS.SCHEDULED}`}>
                      {STATUS_LABEL[appt.status] ?? appt.status}
                    </span>
                    {appt.professional && (
                      <span className="text-zinc-600 text-xs">{appt.professional.name}</span>
                    )}
                  </div>
                  <div className="text-zinc-400 text-xs mb-0.5">{appt.service.name} · {fmtHora(appt.scheduledAt)}</div>
                  <div className="text-teal-400 text-xs truncate">{enderecoCompleto(appt)}</div>
                  {appt.distanceKm != null && (
                    <div className="text-zinc-600 text-xs mt-0.5">{appt.distanceKm.toFixed(1)} km
                      {appt.travelFee != null && appt.travelFee > 0 && ` · taxa R$ ${appt.travelFee.toFixed(2)}`}
                    </div>
                  )}
                </div>

                {/* ações */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {isAgendado && (
                    <button onClick={() => mudarStatus(appt.id, "IN_PROGRESS")} disabled={carregando}
                      className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                      {carregando ? "..." : "Iniciar rota"}
                    </button>
                  )}
                  {isEmRota && (
                    <button onClick={() => mudarStatus(appt.id, "DONE")} disabled={carregando}
                      className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                      {carregando ? "..." : "Concluir"}
                    </button>
                  )}
                  {!isDone && (
                    <a href={`/dashboard/pix?appt=${appt.id}`}
                      className="text-xs text-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap">
                      PIX direto
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ABA KIT ── */}
      {aba === "kit" && (
        <div className="max-w-2xl">
          {kitCritico > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mb-3 flex items-center gap-3">
              <span className="text-red-400 text-base">⚠</span>
              <div>
                <div className="text-red-400 text-sm font-medium">{kitCritico} {kitCritico === 1 ? "item abaixo" : "itens abaixo"} do mínimo</div>
                <div className="text-zinc-500 text-xs">Reponha antes de sair para o primeiro atendimento</div>
              </div>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {kitLoading ? (
              <div className="p-6 text-center text-zinc-500 text-sm">Carregando...</div>
            ) : kitItems.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-zinc-600 text-3xl mb-2">🧳</div>
                <div className="text-zinc-400 text-sm">Nenhum item no kit ainda</div>
                <div className="text-zinc-600 text-xs mt-1">Adicione os itens que você leva para os atendimentos</div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2.5 text-zinc-600 text-xs font-mono uppercase">Item</th>
                    <th className="text-center px-3 py-2.5 text-zinc-600 text-xs font-mono uppercase">Qtd</th>
                    <th className="text-center px-3 py-2.5 text-zinc-600 text-xs font-mono uppercase">Mín</th>
                    <th className="text-left px-3 py-2.5 text-zinc-600 text-xs font-mono uppercase">Status</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {kitItems.map((item, i) => {
                    const critico = item.quantity < item.minQuantity
                    const carregando = salvandoQty === item.id
                    return (
                      <tr key={item.id} className={`border-b border-zinc-800 ${i === kitItems.length - 1 ? "border-0" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="text-white text-sm">{item.name}</div>
                          {item.notes && <div className="text-zinc-600 text-xs mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => ajustarQty(item, -1)} disabled={carregando || item.quantity <= 0}
                              className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 rounded text-sm font-bold transition-colors leading-none">
                              −
                            </button>
                            <span className={`w-10 text-center text-sm font-bold ${critico ? "text-red-400" : "text-white"} ${carregando ? "opacity-50" : ""}`}>
                              {item.quantity}
                            </span>
                            <button onClick={() => ajustarQty(item, +1)} disabled={carregando}
                              className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 rounded text-sm font-bold transition-colors leading-none">
                              +
                            </button>
                            <span className="text-zinc-600 text-xs ml-1">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-zinc-500 text-sm">{item.minQuantity}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${critico ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                            {critico ? "⚠ Repor" : "✓ OK"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button onClick={() => deletarItem(item.id)} disabled={deletando === item.id}
                            className="text-zinc-600 hover:text-red-400 disabled:opacity-30 text-sm transition-colors">
                            {deletando === item.id ? "..." : "✕"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <div className="px-4 pb-4">
              <NovoItemForm onAdd={item => setKitItems(prev => [...prev, item])} />
            </div>
          </div>
        </div>
      )}

      {/* ── ABA ZONA ── */}
      {aba === "zona" && (
        <div className="max-w-lg">
          <form onSubmit={salvarZona} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Configurações de atendimento domicílio</div>

            {/* toggle atende domicílio */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-medium">Atende a domicílio</div>
                <div className="text-zinc-500 text-xs mt-0.5">Permite agendamentos do tipo domicílio para você</div>
              </div>
              <button type="button" onClick={() => setAttendsHome(v => !v)}
                className={`w-11 h-6 rounded-full flex items-center transition-all px-0.5 flex-shrink-0 ${attendsHome ? "bg-teal-500 justify-end" : "bg-zinc-700 justify-start"}`}>
                <div className="w-5 h-5 bg-white rounded-full shadow" />
              </button>
            </div>

            {/* raio */}
            <div className={attendsHome ? "" : "opacity-40 pointer-events-none"}>
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400 text-sm">Raio máximo de atendimento</span>
                <span className="text-teal-400 font-bold">{zonaKm} km</span>
              </div>
              <input type="range" min="1" max="50" value={zonaKm} onChange={e => setZonaKm(parseInt(e.target.value))}
                className="w-full accent-teal-500" />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>1 km</span><span>50 km</span>
              </div>
            </div>

            {/* bairros */}
            <div className={attendsHome ? "" : "opacity-40 pointer-events-none"}>
              <label className="text-zinc-400 text-xs mb-2 block">Bairros aceitos (opcional)</label>
              <textarea
                value={zonaAreas}
                onChange={e => setZonaAreas(e.target.value)}
                rows={3}
                placeholder="Ex: Pinheiros, Vila Madalena, Jardins, Consolação..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors placeholder:text-zinc-600 resize-none"
              />
              <p className="text-zinc-600 text-xs mt-1">Separe por vírgula. Se vazio, aceita qualquer bairro dentro do raio.</p>
            </div>

            {/* link pessoal */}
            {zone?.bookingSlug && (
              <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3">
                <div className="text-teal-400 text-xs font-mono mb-1">Link de agendamento pessoal</div>
                <div className="text-white text-sm font-mono">barberos.com/{zone.bookingSlug}</div>
                <div className="text-zinc-500 text-xs mt-1">
                  {attendsHome
                    ? `Clientes fora do raio de ${zonaKm} km não conseguem agendar`
                    : "Atendimento domicílio desativado"}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={salvandoZona}
                className="bg-teal-500/20 hover:bg-teal-500/30 disabled:opacity-50 text-teal-400 font-semibold px-5 py-2.5 rounded-lg text-sm border border-teal-500/20 transition-colors">
                {salvandoZona ? "Salvando..." : "Salvar configurações"}
              </button>
              {salvouZona && <span className="text-green-400 text-sm">✓ Salvo</span>}
            </div>
          </form>
        </div>
      )}

    </DashboardLayout>
  )
}
