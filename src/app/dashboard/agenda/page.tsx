"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const corAppt: Record<string, string> = {
  presencial: "bg-amber-500/15 border-l-2 border-amber-500 text-amber-200",
  domicilio: "bg-teal-500/15 border-l-2 border-teal-500 text-teal-200",
}

const horas = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"]

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dataHoje] = useState(new Date().toISOString().split("T")[0])
  const [modalAberto, setModalAberto] = useState(false)
  const [modalDetalhe, setModalDetalhe] = useState(false)
  const [apptSelecionado, setApptSelecionado] = useState<any | null>(null)
  const [slotSelecionado, setSlotSelecionado] = useState<{hora: string, profId: string} | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [clienteId, setClienteId] = useState("")
  const [servicoId, setServicoId] = useState("")
  const [profId, setProfId] = useState("")
  const [hora, setHora] = useState("09:00")
  const [tipoAtendimento, setTipoAtendimento] = useState("presencial")

 useEffect(() => {
    buscarDados()
  }, [])

  useEffect(() => {
    console.log("Agendamentos carregados:", agendamentos.length, agendamentos)
  }, [agendamentos])

  async function buscarDados() {
    setLoading(true)
    try {
      const [appts, profs, cls, svcs] = await Promise.all([
        fetch(`/api/agendamentos`).then(r => r.json()),
        fetch("/api/equipe").then(r => r.json()),
        fetch("/api/clientes").then(r => r.json()),
        fetch("/api/servicos").then(r => r.json()),
      ])
      setAgendamentos(Array.isArray(appts) ? appts : [])
      setProfissionais(Array.isArray(profs) ? profs : [])
      setClientes(Array.isArray(cls) ? cls : [])
      setServicos(Array.isArray(svcs) ? svcs : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function getAgendamento(hora: string, profId: string) {
    return agendamentos.find((a) => {
      const date = new Date(a.scheduledAt)
      const h = String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0")
      return h === hora && a.professionalId === profId
    })
  }
function getAgendamento(hora: string, profId: string) {
    return agendamentos.find((a) => {
      const date = new Date(a.scheduledAt)
      const h = String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0")
      console.log("Comparando:", h, "===", hora, "prof:", a.professionalId, "===", profId)
      return h === hora && a.professionalId === profId
    })
  }
  function handleSlotClick(h: string, pId: string) {
    const appt = getAgendamento(h, pId)
    if (appt) {
      setApptSelecionado(appt)
      setModalDetalhe(true)
    } else {
      setSlotSelecionado({ hora: h, profId: pId })
      setProfId(pId)
      setHora(h)
      setModalAberto(true)
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const scheduledAt = new Date(`${dataHoje}T${hora}:00-03:00`)
      await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clienteId,
          professionalId: profId,
          serviceId: servicoId,
          scheduledAt: scheduledAt.toISOString(),
          serviceType: tipoAtendimento === "domicilio" ? "HOME_VISIT" : "PRESENTIAL",
        }),
      })
      await buscarDados()
      setModalAberto(false)
      setClienteId("")
      setServicoId("")
    } catch (e) {
      console.error(e)
    } finally {
      setSalvando(false)
    }
  }

  async function handleCancelar() {
    if (!apptSelecionado) return
    await fetch("/api/agendamentos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: apptSelecionado.id, status: "CANCELLED" }),
    })
    await buscarDados()
    setModalDetalhe(false)
  }

  const dataFormatada = new Date(dataHoje + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  })

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Agenda</h1>
          <p className="text-zinc-500 text-sm capitalize">{dataFormatada}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalAberto(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Agendar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
          Carregando agenda...
        </div>
      ) : profissionais.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <div className="text-zinc-600 text-sm mb-2">Nenhum profissional cadastrado</div>
          <a href="/dashboard/equipe" className="text-amber-400 text-sm hover:text-amber-300 transition-colors">
            Cadastrar profissional →
          </a>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

          {/* Cabeçalho profissionais */}
          <div className="grid border-b border-zinc-800" style={{ gridTemplateColumns: `56px repeat(${profissionais.length}, 1fr)` }}>
            <div className="p-2 text-zinc-600 text-xs font-mono text-center border-r border-zinc-800">H</div>
            {profissionais.map((prof) => (
              <div key={prof.id} className="p-2 flex flex-col items-center gap-1 border-r border-zinc-800 last:border-0">
                <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-white">
                  {prof.name?.charAt(0)}
                </div>
                <span className="text-zinc-300 text-xs">{prof.name?.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          {/* Slots */}
          {horas.map((hora) => (
            <div
              key={hora}
              className="grid border-b border-zinc-800 last:border-0"
              style={{ gridTemplateColumns: `56px repeat(${profissionais.length}, 1fr)` }}
            >
              <div className="p-2 text-xs font-mono border-r border-zinc-800 flex items-start justify-center pt-2 text-zinc-600">
                {hora}
              </div>
              {profissionais.map((prof) => {
                const appt = getAgendamento(hora, prof.id)
                const tipo = appt?.serviceType === "HOME_VISIT" ? "domicilio" : "presencial"
                return (
                  <div
                    key={prof.id}
                    className="border-r border-zinc-800 last:border-0 p-1 min-h-[52px] cursor-pointer"
                    onClick={() => handleSlotClick(hora, prof.id)}
                  >
                    {appt ? (
                      <div className={`rounded p-1.5 h-full ${corAppt[tipo]}`}>
                        <div className="text-xs font-semibold leading-tight">{appt.client?.name}</div>
                        <div className="text-xs opacity-60 mt-0.5">{appt.service?.name}</div>
                      </div>
                    ) : (
                      <div className="h-full rounded hover:bg-zinc-800/50 transition-colors"></div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Modal novo agendamento */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Agendamento</h2>
              <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">

              {slotSelecionado && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400 text-sm">
                  ◈ {slotSelecionado.hora} · {profissionais.find(p => p.id === slotSelecionado.profId)?.name}
                </div>
              )}

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Cliente *</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">Selecionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Profissional *</label>
                <select
                  value={profId}
                  onChange={(e) => setProfId(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">Selecionar profissional...</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Serviço *</label>
                <select
                  value={servicoId}
                  onChange={(e) => setServicoId(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">Selecionar serviço...</option>
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — R$ {s.price} · {s.durationMin}min</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Horário *</label>
                <select
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  {horas.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Tipo de atendimento</label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setTipoAtendimento("presencial")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      tipoAtendimento === "presencial"
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-zinc-700 bg-zinc-800"
                    }`}
                  >
                    <span className={`text-xs font-medium ${tipoAtendimento === "presencial" ? "text-amber-400" : "text-zinc-400"}`}>
                      🏪 Presencial
                    </span>
                  </div>
                  <div
                    onClick={() => setTipoAtendimento("domicilio")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      tipoAtendimento === "domicilio"
                        ? "border-teal-500/30 bg-teal-500/10"
                        : "border-zinc-700 bg-zinc-800"
                    }`}
                  >
                    <span className={`text-xs font-medium ${tipoAtendimento === "domicilio" ? "text-teal-400" : "text-zinc-400"}`}>
                      🚗 Domicílio
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {salvando ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalhe agendamento */}
      {modalDetalhe && apptSelecionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Detalhes do Agendamento</h2>
              <button onClick={() => setModalDetalhe(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="text-white font-bold text-base mb-1">{apptSelecionado.client?.name}</div>
                <div className="text-zinc-400 text-sm">{apptSelecionado.service?.name}</div>
                <div className="text-zinc-500 text-xs mt-1">
                  ⏰ {new Date(apptSelecionado.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {apptSelecionado.professional?.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Valor</div>
                  <div className="text-amber-400 font-bold">R$ {apptSelecionado.service?.price}</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Status</div>
                  <div className="text-green-400 font-medium text-sm">{apptSelecionado.status}</div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setModalDetalhe(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Fechar
                </button>
                <button onClick={handleCancelar} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2.5 rounded-lg text-sm border border-red-500/20 transition-colors">
                  ✕ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}