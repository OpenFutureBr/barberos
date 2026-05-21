"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/DashboardLayout"

const statusLabel: Record<string, string> = {
  SCHEDULED: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
}

const statusCor: Record<string, string> = {
  SCHEDULED: "text-amber-400",
  CONFIRMED: "text-green-400",
  COMPLETED: "text-blue-400",
  CANCELLED: "text-red-400",
  NO_SHOW: "text-zinc-500",
}

const corAppt: Record<string, string> = {
  presencial: "bg-amber-500/15 border-l-2 border-amber-500 text-amber-200",
  domicilio: "bg-teal-500/15 border-l-2 border-teal-500 text-teal-200",
  concluido: "bg-green-500/15 border-l-2 border-green-400 text-green-200 opacity-60",
  cancelado: "bg-red-500/15 border-l-2 border-red-400 text-red-300 opacity-50",
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

function adicionarMinutos(data: Date, minutos: number) {
  return new Date(data.getTime() + minutos * 60 * 1000)
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
  const router = useRouter()
  const hojeISO = getDataSaoPaulo(new Date())

  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [agendamentosSemana, setAgendamentosSemana] = useState<Record<string, any[]>>({})
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [loadingProfs, setLoadingProfs] = useState(true)
  const [loadingAppts, setLoadingAppts] = useState(true)
  const cacheAppts = useRef<Record<string, any[]>>({})

  const [modalDetalhe, setModalDetalhe] = useState(false)
  const [apptSelecionado, setApptSelecionado] = useState<any | null>(null)

  // Comanda do agendamento — persiste em sessionStorage
  const [produtosEstoque, setProdutosEstoque] = useState<any[]>([])
  const [comandas, setComandas] = useState<Record<string, { produto: any; qty: number }[]>>({})
  const [buscaProduto, setBuscaProduto] = useState("")
  const [dropdownProduto, setDropdownProduto] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({})
  const [dragAppt, setDragAppt] = useState<any>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [movendo, setMovendo] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  // Carrega comandas do sessionStorage ao montar
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("barberos_comandas")
      if (saved) setComandas(JSON.parse(saved))
    } catch {}
  }, [])

  // Atualiza status imediatamente ao confirmar pagamento
  useEffect(() => {
    function onPago(e: Event) {
      const id = (e as CustomEvent).detail as string
      if (id) setStatusOverride(prev => ({ ...prev, [id]: "DONE" }))
    }
    window.addEventListener("pagamentoConfirmado", onPago)
    return () => window.removeEventListener("pagamentoConfirmado", onPago)
  }, [])

  // Salva comandas no sessionStorage sempre que mudar
  useEffect(() => {
    try {
      sessionStorage.setItem("barberos_comandas", JSON.stringify(comandas))
    } catch {}
  }, [comandas])
  const [dataSelecionada, setDataSelecionada] = useState(hojeISO)
  const [profFiltro, setProfFiltro] = useState<string>("") // "" = visão geral
  const [iniciJanela, setInicioJanela] = useState(hojeISO)
  const [filtroStatus, setFiltroStatus] = useState<"ativos" | "todos" | "cancelados">("ativos")

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

  // Auto-scroll para a hora atual ao abrir
  useEffect(() => {
    if (linhaVermelha === null || !gridRef.current) return
    // Mostra 2 horas antes da hora atual para dar contexto
    const scrollY = Math.max(0, linhaVermelha - SLOT_HEIGHT * 2)
    gridRef.current.scrollTo({ top: scrollY, behavior: "smooth" })
  }, [linhaVermelha, loadingProfs])

  const janela6Dias = gerarJanela6Dias(iniciJanela)

  const [businessHours, setBusinessHours] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/equipe").then(r => r.json()),
      fetch("/api/configuracoes").then(r => r.json()),
    ]).then(([profs, cfg]) => {
      setProfissionais(Array.isArray(profs) ? profs : [])
      if (Array.isArray(cfg?.businessHours)) setBusinessHours(cfg.businessHours)
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

  function abrirDetalhe(appt: any) {
    setApptSelecionado(appt)
    setBuscaProduto("")
    setModalDetalhe(true)
    if (produtosEstoque.length === 0) {
      fetch("/api/estoque").then(r => r.json()).then(d => setProdutosEstoque(Array.isArray(d) ? d.filter((p: any) => p.isActive && p.stock > 0) : [])).catch(() => {})
    }
  }

  function handleFinalizarComanda() {
    if (!apptSelecionado) return
    const apptId = apptSelecionado.id
    const itensComanda = comandas[apptId] ?? []
    const precoCorte = apptSelecionado.service?.price ?? 0
    const totalProdutos = itensComanda.reduce((s: number, i: any) => s + i.qty * i.produto.salePrice, 0)
    setModalDetalhe(false)
    window.dispatchEvent(new CustomEvent("abrirPagamento", {
      detail: {
        appointmentId: apptId,
        clientName: apptSelecionado.client?.name ?? "",
        serviceName: apptSelecionado.service?.name ?? "",
        professionalName: apptSelecionado.professional?.name ?? "",
        scheduledAt: apptSelecionado.scheduledAt,
        amount: precoCorte + totalProdutos,
        comandaItens: itensComanda.map((i: any) => ({
          productId: i.produto.id,
          nome: i.produto.name,
          qty: i.qty,
          unitPrice: i.produto.salePrice,
        })),
      },
    }))
  }

  async function handleCancelar() {
    if (!apptSelecionado) return
    const res = await fetch("/api/agendamentos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: apptSelecionado.id, status: "CANCELLED" }),
    })
    if (!res.ok) { alert("Erro ao cancelar agendamento"); return }
    // Limpa todo o cache e recarrega
    cacheAppts.current = {}
    if (profFiltro) {
      janela6Dias.forEach(d => buscarAgendamentos(d))
    } else {
      await buscarAgendamentos(dataSelecionada)
    }
    setModalDetalhe(false)
  }

  function isCancelado(a: any) {
    return a.status === "CANCELLED" || a.status === "NO_SHOW"
  }

  function isPendente(appt: any): boolean {
    const status = statusOverride[appt.id] ?? appt.status
    return ["SCHEDULED", "CONFIRMED", "IN_QUEUE"].includes(status)
  }

  function isDropValido(profId: string, hora: string, data: string): boolean {
    if (!dragAppt) return false
    if (!isPendente(dragAppt)) return false
    // Tempo não passou
    const slotTime = new Date(`${data}T${hora}:00-03:00`)
    if (slotTime <= new Date()) return false
    // Não é o mesmo slot
    const dragDate = new Date(dragAppt.scheduledAt)
    const dragHoraStr = `${String(dragDate.getHours()).padStart(2, "0")}:00`
    const dragDataStr = getDataSaoPaulo(dragDate)
    if (profId === dragAppt.professionalId && hora === dragHoraStr && data === dragDataStr) return false
    // Barber pode realizar este serviço
    const prof = profissionais.find(p => p.id === profId)
    const serviceId = dragAppt.serviceId ?? dragAppt.service?.id
    const podeServico = prof?.userServices?.some((us: any) => us.serviceId === serviceId)
    if (!podeServico) return false
    // Se for domicílio, barbeiro deve atender a domicílio
    if (dragAppt.serviceType === "HOME_VISIT" && !prof?.attendsHome) return false

    // Verifica horários de funcionamento (estabelecimento ∩ barbeiro)
    const diaSemanaNum = new Date(data + "T12:00:00").getDay()
    const horaEstab = businessHours.find((d: any) => d.dayOfWeek === diaSemanaNum)
    if (horaEstab?.isOpen === false) return false // estabelecimento fechado no dia

    const estabInicio = horaEstab?.startTime ?? "08:00"
    const estabFim = horaEstab?.endTime ?? "22:00"
    const scheduleDia = prof?.schedules?.find((s: any) => s.dayOfWeek === diaSemanaNum)
    if (scheduleDia && scheduleDia.isActive === false) return false // barbeiro não trabalha

    const profInicio = scheduleDia?.startTime ?? estabInicio
    const profFim = scheduleDia?.endTime ?? estabFim

    // Interseção dos horários
    const iniEfetivo = profInicio > estabInicio ? profInicio : estabInicio
    const fimEfetivo = profFim < estabFim ? profFim : estabFim

    // Slot deve estar dentro do intervalo e o corte deve terminar antes do fechamento
    const [sh, sm] = hora.split(":").map(Number)
    const [ih, im] = iniEfetivo.split(":").map(Number)
    const [fh, fm] = fimEfetivo.split(":").map(Number)
    const slotMin = sh * 60 + sm
    const iniMin = ih * 60 + im
    const fimMin = fh * 60 + fm
    const duracaoAppt = dragAppt.service?.durationMin ?? 30

    if (slotMin < iniMin) return false    // antes da abertura
    if (slotMin >= fimMin) return false   // início no encerramento ou depois

    // Sem conflito de horário
    const apptsList = profFiltro ? (agendamentosSemana[data] ?? []) : agendamentos
    const breakProf = prof?.breakBetweenAppts ?? 10
    const novIni = slotTime
    const novFim = adicionarMinutos(novIni, duracaoAppt + breakProf)
    return !apptsList.some(a => {
      if (a.id === dragAppt.id) return false
      if (a.professionalId !== profId) return false
      const st = statusOverride[a.id] ?? a.status
      if (["CANCELLED", "NO_SHOW", "DONE"].includes(st)) return false
      const ini = new Date(a.scheduledAt)
      const fim = adicionarMinutos(ini, (a.service?.durationMin ?? 30) + breakProf)
      return novIni < fim && novFim > ini
    })
  }

  async function executarMover(profId: string, hora: string, data: string) {
    if (!dragAppt || !isDropValido(profId, hora, data)) return
    setMovendo(true)
    const novaHora = new Date(`${data}T${hora}:00-03:00`)
    const dataOriginal = getDataSaoPaulo(new Date(dragAppt.scheduledAt))
    try {
      await fetch("/api/agendamentos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dragAppt.id, professionalId: profId, scheduledAt: novaHora.toISOString() }),
      })
      delete cacheAppts.current[dataOriginal]
      delete cacheAppts.current[data]
      await buscarAgendamentos(data)
      if (data !== dataOriginal) await buscarAgendamentos(dataOriginal)
    } catch (e) { console.error(e) }
    finally { setDragAppt(null); setDragOverKey(null); setMovendo(false) }
  }

  function getApptsDaHora(hora: string, profId: string, appts: any[]) {
    const [horaNum] = hora.split(":").map(Number)
    return appts.filter((a) => {
      const date = new Date(a.scheduledAt)
      if (date.getHours() !== horaNum || a.professionalId !== profId) return false
      const cancelado = isCancelado(a)
      if (filtroStatus === "ativos") return !cancelado
      if (filtroStatus === "cancelados") return cancelado
      return true
    })
  }

  function handleSlotClick(h: string, pId: string, data?: string) {
    const appts = data ? (agendamentosSemana[data] || []) : agendamentos
    const appt = appts.find((a) => {
      const date = new Date(a.scheduledAt)
      const hh = String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0")
      if (hh !== h || a.professionalId !== pId) return false
      const cancelado = isCancelado(a)
      if (filtroStatus === "ativos") return !cancelado
      if (filtroStatus === "cancelados") return cancelado
      return true
    })
    if (appt) {
      abrirDetalhe(appt)
    } else {
      window.dispatchEvent(new CustomEvent("abrirModalAgenda", {
        detail: { hora: h, profId: pId, data: data || dataSelecionada }
      }))
    }
  }

  function renderSlots(hora: string, profId: string, appts: any[], data?: string) {
    const dataEfetiva = data ?? dataSelecionada
    const slotKey = `${profId}|${hora}|${dataEfetiva}`
    const isDragOver = dragOverKey === slotKey
    const valido = dragAppt ? isDropValido(profId, hora, dataEfetiva) : false

    const apptsDaHora = getApptsDaHora(hora, profId, appts)
    return (
      <div className={`border-r border-zinc-800 last:border-0 relative transition-colors ${
        dragAppt
          ? isDragOver && valido
            ? "bg-green-500/15"
            : isDragOver && !valido
              ? "bg-red-500/10"
              : ""
          : ""
      }`}
        style={{ height: SLOT_HEIGHT }}
        onClick={() => !dragAppt && handleSlotClick(hora, profId, data)}
        onDragOver={e => {
          e.preventDefault()
          e.dataTransfer.dropEffect = valido ? "move" : "none"
          setDragOverKey(slotKey)
        }}
        onDragLeave={() => setDragOverKey(null)}
        onDrop={e => { e.preventDefault(); executarMover(profId, hora, dataEfetiva) }}
      >
        {apptsDaHora.length === 0 && (
          <div className="absolute inset-1 rounded hover:bg-zinc-800/50 transition-colors" />
        )}
        {apptsDaHora.map((appt) => {
          const date = new Date(appt.scheduledAt)
          const minutos = date.getMinutes()
          const duracaoMin = appt.service?.durationMin || 30
          const topPct = (minutos / 60) * 100
          const heightPct = Math.min((duracaoMin / 60) * 100, 100 - topPct)
          const statusEfetivo = statusOverride[appt.id] ?? appt.status
          const cancelado = statusEfetivo === "CANCELLED" || statusEfetivo === "NO_SHOW"
          const concluido = statusEfetivo === "DONE"
          const pendente = isPendente(appt)
          const estaDragando = dragAppt?.id === appt.id
          const cor = cancelado
            ? corAppt.cancelado
            : concluido
              ? corAppt.concluido
              : corAppt[appt.serviceType === "HOME_VISIT" ? "domicilio" : "presencial"]
          return (
            <div key={appt.id}
              draggable={pendente}
              onDragStart={e => {
                e.stopPropagation()
                setDragAppt(appt)
                setModalDetalhe(false)
                e.dataTransfer.effectAllowed = "move"
              }}
              onDragEnd={() => { setDragAppt(null); setDragOverKey(null) }}
              className={`absolute left-1 right-1 rounded px-1 overflow-hidden transition-opacity ${cor} ${
                pendente ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
              } ${estaDragando ? "opacity-40" : ""}`}
              style={{ top: `${topPct}%`, height: `${heightPct}%`, minHeight: 18, zIndex: 1 }}
              onClick={(e) => { if (!dragAppt) { e.stopPropagation(); abrirDetalhe(appt) } }}>
              <div className={`text-xs font-semibold leading-tight truncate ${cancelado ? "line-through opacity-70" : ""}`}>
                {appt.client?.name}
                {comandas[appt.id]?.length > 0 && <span className="ml-1 text-green-400">●</span>}
              </div>
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
            {movendo ? "Movendo agendamento..." : profFiltro ? profSelecionado?.name : dataFormatada}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtro de status */}
          <div className="flex items-center gap-0.5 bg-zinc-800 border border-zinc-700 rounded-lg p-0.5">
            {(["ativos", "todos", "cancelados"] as const).map((f) => (
              <button key={f} onClick={() => setFiltroStatus(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filtroStatus === f
                    ? f === "cancelados" ? "bg-red-500/20 text-red-400" : "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}>
                {f === "ativos" ? "Ativos" : f === "todos" ? "Todos" : "Cancelados"}
              </button>
            ))}
          </div>

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
          {/* Cabeçalho com 6 datas — sticky */}
          <div className="sticky top-0 z-20 bg-zinc-900 grid border-b border-zinc-800" style={{ gridTemplateColumns: `56px repeat(6, 1fr)` }}>
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
        <div ref={gridRef} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-y-auto" style={{ maxHeight: "calc(100vh - 10rem)" }}>
          {/* Cabeçalho profissionais — sticky */}
          <div className="sticky top-0 z-20 bg-zinc-900 grid border-b border-zinc-800" style={{ gridTemplateColumns: `56px repeat(${profissionaisExibidos.length}, 1fr)` }}>
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

      {/* Modal detalhe — Comanda */}
      {modalDetalhe && apptSelecionado && (() => {
        const apptId = apptSelecionado.id
        const itensComanda = comandas[apptId] ?? []
        const precoCorte = apptSelecionado.service?.price ?? 0
        const totalProdutos = itensComanda.reduce((s, i) => s + i.qty * i.produto.salePrice, 0)
        const totalComanda = precoCorte + totalProdutos
        const statusAtual = statusOverride[apptId] ?? apptSelecionado.status
        const cancelado = statusAtual === "CANCELLED" || statusAtual === "NO_SHOW"

        async function mudarStatus(novoStatus: string) {
          await fetch("/api/agendamentos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: apptId, status: novoStatus }),
          })
          setStatusOverride(prev => ({ ...prev, [apptId]: novoStatus }))
          cacheAppts.current = {}
          if (profFiltro) janela6Dias.forEach(d => buscarAgendamentos(d))
          else buscarAgendamentos(dataSelecionada)
        }

        const produtosFiltrados = produtosEstoque.filter(p =>
          buscaProduto.length === 0 || p.name.toLowerCase().includes(buscaProduto.toLowerCase())
        ).slice(0, 6)

        function addItem(p: any) {
          setComandas(prev => {
            const curr = prev[apptId] ?? []
            const idx = curr.findIndex(i => i.produto.id === p.id)
            if (idx >= 0) {
              const n = [...curr]; n[idx] = { ...n[idx], qty: n[idx].qty + 1 }
              return { ...prev, [apptId]: n }
            }
            return { ...prev, [apptId]: [...curr, { produto: p, qty: 1 }] }
          })
          setBuscaProduto(""); setDropdownProduto(false)
        }

        function updateQty(idx: number, delta: number) {
          setComandas(prev => {
            const curr = [...(prev[apptId] ?? [])]
            const novaQty = Math.max(1, Math.min(100, curr[idx].qty + delta))
            curr[idx] = { ...curr[idx], qty: novaQty }
            return { ...prev, [apptId]: curr }
          })
        }

        function removeItem(idx: number) {
          setComandas(prev => ({ ...prev, [apptId]: (prev[apptId] ?? []).filter((_, i) => i !== idx) }))
        }

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                <h2 className="text-white font-bold">Detalhes do Agendamento</h2>
                <button onClick={() => setModalDetalhe(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
              </div>

              <div className="p-5 space-y-4">
                {/* Cabeçalho do agendamento */}
                <div>
                  <div className="text-white font-bold text-lg">{apptSelecionado.client?.name}</div>
                  <div className="text-zinc-400 text-sm mt-0.5">{apptSelecionado.service?.name}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">
                    {apptSelecionado.professional?.name} · {new Date(apptSelecionado.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {/* Valor e status */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Valor do corte</div>
                    <div className="text-amber-400 font-bold">R$ {Number(precoCorte).toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-zinc-500 text-xs mb-1">Status</div>
                    <select value={statusAtual} onChange={(e) => mudarStatus(e.target.value)}
                      className={`w-full bg-transparent border-0 outline-none text-sm font-medium cursor-pointer ${statusCor[statusAtual] ?? "text-zinc-400"}`}>
                      <option value="SCHEDULED" className="bg-zinc-800 text-white">Pendente</option>
                      <option value="CONFIRMED" className="bg-zinc-800 text-white">Confirmado</option>
                      <option value="IN_PROGRESS" className="bg-zinc-800 text-white">Em andamento</option>
                      <option value="DONE" className="bg-zinc-800 text-white">Concluído</option>
                      <option value="CANCELLED" className="bg-zinc-800 text-white">Cancelado</option>
                      <option value="NO_SHOW" className="bg-zinc-800 text-white">Não compareceu</option>
                    </select>
                  </div>
                </div>

                {/* Adicionar produto à comanda */}
                {!cancelado && (
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Adicionar produto à comanda</label>
                    <div className="relative">
                      <input value={buscaProduto}
                        onChange={(e) => { setBuscaProduto(e.target.value); setDropdownProduto(true) }}
                        onFocus={() => setDropdownProduto(true)}
                        onBlur={() => setTimeout(() => setDropdownProduto(false), 150)}
                        placeholder="Buscar produto no estoque..."
                        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                      {dropdownProduto && (
                        produtosFiltrados.length > 0 ? (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                            {produtosFiltrados.map(p => (
                              <button key={p.id} type="button"
                                onMouseDown={() => addItem(p)}
                                className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700 last:border-0 transition-colors">
                                <div className="flex justify-between">
                                  <span className="text-white text-sm">{p.name}</span>
                                  <span className="text-amber-400 text-sm font-mono">R$ {p.salePrice?.toFixed(2)}</span>
                                </div>
                                <div className="text-zinc-500 text-xs">Estoque: {p.stock}</div>
                              </button>
                            ))}
                          </div>
                        ) : buscaProduto.length > 0 ? (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-500 text-sm shadow-xl">
                            Nenhum produto encontrado
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {/* Itens adicionados com wheel scroll de quantidade */}
                {itensComanda.length > 0 && (
                  <div className="space-y-2">
                    {itensComanda.map((item, idx) => (
                      <div key={idx} className="bg-zinc-800 rounded-lg p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{item.produto.name}</div>
                          <div className="text-zinc-500 text-xs">R$ {item.produto.salePrice?.toFixed(2)}</div>
                        </div>
                        {/* Wheel scroll de quantidade */}
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => updateQty(idx, -1)}
                            className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-sm flex items-center justify-center transition-colors">−</button>
                          <span className="text-white font-bold w-6 text-center">{item.qty}</span>
                          <button type="button" onClick={() => updateQty(idx, 1)}
                            className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-sm flex items-center justify-center transition-colors">+</button>
                        </div>
                        <div className="text-amber-400 text-sm font-bold w-16 text-right">
                          R$ {(item.produto.salePrice * item.qty).toFixed(2)}
                        </div>
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-zinc-600 hover:text-red-400 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comanda — resumo */}
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 space-y-2">
                  <div className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Comanda</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">✂️ {apptSelecionado.service?.name}</span>
                    <span className="text-white font-medium">R$ {Number(precoCorte).toFixed(2)}</span>
                  </div>
                  {itensComanda.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-zinc-400">{item.qty}× {item.produto.name}</span>
                      <span className="text-white font-medium">R$ {(item.produto.salePrice * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-700 pt-2 flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-amber-400 font-bold text-lg">R$ {totalComanda.toFixed(2)}</span>
                  </div>
                </div>

                {/* Finalizar cobrança — só quando pendente */}
                {!cancelado && statusAtual !== "DONE" && (
                  <div className="flex gap-2">
                    <button onClick={() => setModalDetalhe(false)}
                      className="flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold px-5 py-3.5 rounded-xl text-sm border border-zinc-700 transition-colors">
                      Salvar
                    </button>
                    <button onClick={handleFinalizarComanda} disabled={finalizando}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl text-base transition-colors">
                      {finalizando ? "Aguarde..." : `Finalizar cobrança · R$ ${totalComanda.toFixed(2)}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

    </DashboardLayout>
  )
}