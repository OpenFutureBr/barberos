"use client"

import React, { useState, useEffect, useRef } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const corAppt: Record<string, string> = {
  presencial: "bg-amber-500/15 border-l-2 border-amber-500 text-amber-200",
  domicilio: "bg-teal-500/15 border-l-2 border-teal-500 text-teal-200",
}

const HORA_INICIO = 8
const HORA_FIM = 22
const horas = Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) =>
  `${String(HORA_INICIO + i).padStart(2, "0")}:00`
)
const SLOT_HEIGHT = 64

function getDataSaoPaulo(data: Date) {
  return data.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

function adicionarDias(dataISO: string, dias: number) {
  const d = new Date(dataISO + "T12:00:00")
  d.setDate(d.getDate() + dias)
  return getDataSaoPaulo(d)
}

function gerarJanela6Dias(dataISO: string): string[] {
  return Array.from({ length: 6 }, (_, i) => adicionarDias(dataISO, i))
}

function formatarDataCurta(dataISO: string) {
  const d = new Date(dataISO + "T12:00:00")
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
}

export default function AgendaPage() {
  const hojeISO = getDataSaoPaulo(new Date())

  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [agendamentosSemana, setAgendamentosSemana] = useState<Record<string, any[]>>({})
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [loadingProfs, setLoadingProfs] = useState(true)
  const [loadingAppts, setLoadingAppts] = useState(true)
  const cacheAppts = useRef<Record<string, any[]>>({})

  const [modalDetalhe, setModalDetalhe] = useState(false)
  const [apptSelecionado, setApptSelecionado] = useState<any | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState(hojeISO)
  const [profFiltro, setProfFiltro] = useState<string>("") // "" = visão geral
  const [iniciJanela, setInicioJanela] = useState(hojeISO)

  const isHoje = dataSelecionada === hojeISO
  const dataFormatada = new Date(dataSelecionada + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  })

  // Linha vermelha da hora atual
  const [linhaVermelha, setLinhaVermelha] = useState<number | null>(null)
  useEffect(() => {
    function calcularLinha() {
      if (dataSelecionada !== hojeISO) { setLinhaVermelha(null); return }
      const agora = new Date()
      const horaAtual = agora.getHours() + agora.getMinutes() / 60
      if (horaAtual < HORA_INICIO || horaAtual > HORA_FIM + 1) { setLinhaVermelha(null); return }
      const posicao = (horaAtual - HORA_INICIO) * SLOT_HEIGHT
      setLinhaVermelha(posicao)
    }
    calcularLinha()
    const interval = setInterval(calcularLinha, 60000)
    return () => clearInterval(interval)
  }, [dataSelecionada, hojeISO])

  const janela6Dias = gerarJanela6Dias(iniciJanela)

  useEffect(() => {
    fetch("/api/equipe").then(r => r.json()).then(profs => {
      setProfissionais(Array.isArray(profs) ? profs : [])
      setLoadingProfs(false)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (profFiltro) {
      // Visão semanal: busca os 6 dias
      janela6Dias.forEach(data => buscarAgendamentos(data))
    } else {
      buscarAgendamentos(dataSelecionada)
    }
  }, [dataSelecionada, profFiltro, iniciJanela])

  useEffect(() => {
    function handleSalvo() {
      if (profFiltro) {
        janela6Dias.forEach(data => {
          delete cacheAppts.current[data]
          buscarAgendamentos(data)
        })
      } else {
        delete cacheAppts.current[dataSelecionada]
        buscarAgendamentos(dataSelecionada)
      }
    }
    window.addEventListener("agendamentoSalvo", handleSalvo)
    return () => window.removeEventListener("agendamentoSalvo", handleSalvo)
  }, [dataSelecionada, profFiltro, iniciJanela])

  async function buscarAgendamentos(data: string) {
    if (cacheAppts.current[data]) {
      if (profFiltro) {
        setAgendamentosSemana(prev => ({ ...prev, [data]: cacheAppts.current[data] }))
      } else {
        setAgendamentos(cacheAppts.current[data])
        setLoadingAppts(false)
      }
      return
    }
    setLoadingAppts(true)
    try {
      const appts = await fetch(`/api/agendamentos?data=${data}`).then(r => r.json())
      const lista = Array.isArray(appts) ? appts : []
      cacheAppts.current[data] = lista
      if (profFiltro) {
        setAgendamentosSemana(prev => ({ ...prev, [data]: lista }))
      } else {
        setAgendamentos(lista)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAppts(false)
    }
  }

  async function handleCancelar() {
    if (!apptSelecionado) return
    await fetch("/api/agendamentos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: apptSelecionado.id, status: "CANCELLED" }),
    })
    delete cacheAppts.current[dataSelecionada]
    await buscarAgendamentos(dataSelecionada)
    setModalDetalhe(false)
  }

  function getApptsDaHora(hora: string, profId: string, appts: any[]) {
    const [horaNum] = hora.split(":").map(Number)
    return appts.filter((a) => {
      const date = new Date(a.scheduledAt)
      return date.getHours() === horaNum && a.professionalId === profId
        && a.status !== "CANCELLED" && a.status !== "NO_SHOW"
    })
  }

  function handleSlotClick(h: string, pId: string, data?: string) {
    const appts = data ? (agendamentosSemana[data] || []) : agendamentos
    const appt = appts.find((a) => {
      const date = new Date(a.scheduledAt)
      const hh = String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0")
      return hh === h && a.professionalId === pId
    })
    if (appt) {
      setApptSelecionado(appt)
      setModalDetalhe(true)
    } else {
      window.dispatchEvent(new CustomEvent("abrirModalAgenda", {
        detail: { hora: h, profId: pId, data: data || dataSelecionada }
      }))
    }
  }

  function renderSlots(hora: string, profId: string, appts: any[], data?: string) {
    const apptsDaHora = getApptsDaHora(hora, profId, appts)
    return (
      <div className="border-r border-zinc-800 last:border-0 relative"
        style={{ height: SLOT_HEIGHT }}
        onClick={() => handleSlotClick(hora, profId, data)}>
        {apptsDaHora.length === 0 && (
          <div className="absolute inset-1 rounded hover:bg-zinc-800/50 transition-colors" />
        )}
        {apptsDaHora.map((appt) => {
          const date = new Date(appt.scheduledAt)
          const minutos = date.getMinutes()
          const duracaoMin = appt.service?.durationMin || 30
          const topPct = (minutos / 60) * 100
          const heightPct = Math.min((duracaoMin / 60) * 100, 100 - topPct)
          const tipo = appt.serviceType === "HOME_VISIT" ? "domicilio" : "presencial"
          return (
            <div key={appt.id}
              className={`absolute left-1 right-1 rounded px-1 overflow-hidden cursor-pointer ${corAppt[tipo]}`}
              style={{ top: `${topPct}%`, height: `${heightPct}%`, minHeight: 18, zIndex: 1 }}
              onClick={(e) => { e.stopPropagation(); setApptSelecionado(appt); setModalDetalhe(true) }}>
              <div className="text-xs font-semibold leading-tight truncate">{appt.client?.name}</div>
              {heightPct > 30 && <div className="text-xs opacity-60 truncate">{appt.service?.name}</div>}
            </div>
          )
        })}
      </div>
    )
  }

  const profSelecionado = profissionais.find(p => p.id === profFiltro)

  // Cabeçalho da visão geral: ativos + quem tem agendamento no dia, respeitando data de admissão
  const profissionaisExibidos = profissionais.filter(p => {
    if (p.admissionDate) {
      const admissao = p.admissionDate.slice(0, 10)
      if (dataSelecionada < admissao) return false
    }
    return p.isActive !== false ||
      agendamentos.some(a => a.professionalId === p.id && a.status !== "CANCELLED" && a.status !== "NO_SHOW")
  })

  return (
    <DashboardLayout>

      {/* Navegação */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Agenda</h1>
          <p className="text-zinc-500 text-sm capitalize">
            {profFiltro ? profSelecionado?.name : dataFormatada}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de profissional */}
          <select
            value={profFiltro}
            onChange={(e) => { setProfFiltro(e.target.value); setInicioJanela(hojeISO) }}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">Visão geral</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.name?.split(" ")[0]}</option>)}
          </select>

          {profFiltro ? (
            // Navegação da janela de 6 dias
            <>
              <button onClick={() => setInicioJanela(adicionarDias(iniciJanela, -6))}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm transition-colors">←</button>
              <button onClick={() => setInicioJanela(hojeISO)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  iniciJanela === hojeISO ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                }`}>Hoje</button>
              <button onClick={() => setInicioJanela(adicionarDias(iniciJanela, 6))}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm transition-colors">→</button>
            </>
          ) : (
            // Navegação diária
            <>
              <button onClick={() => setDataSelecionada(adicionarDias(dataSelecionada, -1))}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm transition-colors">←</button>
              <button onClick={() => setDataSelecionada(hojeISO)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isHoje ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                }`}>Hoje</button>
              <button onClick={() => setDataSelecionada(adicionarDias(dataSelecionada, 1))}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm transition-colors">→</button>
            </>
          )}
        </div>
      </div>

      {loadingProfs ? (
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
      ) : profFiltro ? (

        /* ── VISÃO SEMANAL DO PROFISSIONAL ── */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Cabeçalho com 6 datas */}
          <div className="grid border-b border-zinc-800" style={{ gridTemplateColumns: `56px repeat(6, 1fr)` }}>
            <div className="p-2 text-zinc-600 text-xs font-mono text-center border-r border-zinc-800">H</div>
            {janela6Dias.map((data) => {
              const isToday = data === hojeISO
              return (
                <div key={data} className={`p-2 flex flex-col items-center gap-0.5 border-r border-zinc-800 last:border-0 ${isToday ? "bg-amber-500/5" : ""}`}>
                  <span className={`text-xs font-medium ${isToday ? "text-amber-400" : "text-zinc-300"}`}>
                    {formatarDataCurta(data)}
                  </span>
                </div>
              )
            })}
          </div>

          {loadingAppts && (
            <div className="text-center py-1.5 text-zinc-600 text-xs border-b border-zinc-800">Atualizando...</div>
          )}

          {/* Slots semanais */}
          <div className="relative">
            {linhaVermelha !== null && janela6Dias.includes(hojeISO) && (
              <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                style={{ top: linhaVermelha }}>
                <div className="w-14 flex-shrink-0 flex justify-end pr-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 h-px bg-red-500 opacity-70" />
              </div>
            )}
            {horas.map((hora) => (
              <div key={hora} className="grid border-b border-zinc-800 last:border-0"
                style={{ gridTemplateColumns: `56px repeat(6, 1fr)`, height: SLOT_HEIGHT }}>
                <div className="p-2 text-xs font-mono border-r border-zinc-800 flex items-start justify-center pt-2 text-zinc-600">
                  {hora}
                </div>
                {janela6Dias.map((data) => {
                  const appts = agendamentosSemana[data] || []
                  return (
                    <div key={data} className={`border-r border-zinc-800 last:border-0 ${data === hojeISO ? "bg-amber-500/3" : ""}`}>
                      {renderSlots(hora, profFiltro, appts, data)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

      ) : (

        /* ── VISÃO GERAL POR PROFISSIONAL ── */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Cabeçalho profissionais */}
          <div className="grid border-b border-zinc-800" style={{ gridTemplateColumns: `56px repeat(${profissionaisExibidos.length}, 1fr)` }}>
            <div className="p-2 text-zinc-600 text-xs font-mono text-center border-r border-zinc-800">H</div>
            {profissionaisExibidos.map((prof) => (
              <div key={prof.id} className="p-2 flex flex-col items-center gap-1 border-r border-zinc-800 last:border-0">
                <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-white">
                  {prof.name?.charAt(0)}
                </div>
                <span className="text-zinc-300 text-xs">{prof.name?.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          {loadingAppts && (
            <div className="text-center py-1.5 text-zinc-600 text-xs border-b border-zinc-800">Atualizando...</div>
          )}

          {/* Slots com linha vermelha */}
          <div className="relative">
            {/* Linha vermelha da hora atual */}
            {linhaVermelha !== null && (
              <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                style={{ top: linhaVermelha }}>
                <div className="w-14 flex-shrink-0 flex justify-end pr-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 h-px bg-red-500 opacity-70" />
              </div>
            )}

            {horas.map((hora) => (
              <div key={hora} className="grid border-b border-zinc-800 last:border-0"
                style={{ gridTemplateColumns: `56px repeat(${profissionaisExibidos.length}, 1fr)`, height: SLOT_HEIGHT }}>
                <div className="p-2 text-xs font-mono border-r border-zinc-800 flex items-start justify-center pt-2 text-zinc-600">
                  {hora}
                </div>
                {profissionaisExibidos.map((prof) => <React.Fragment key={prof.id}>{renderSlots(hora, prof.id, agendamentos)}</React.Fragment>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal detalhe */}
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
                <button onClick={() => setModalDetalhe(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Fechar
                </button>
                <button onClick={handleCancelar}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2.5 rounded-lg text-sm border border-red-500/20 transition-colors">
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