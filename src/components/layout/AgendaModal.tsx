"use client"

import { useState, useEffect, useRef } from "react"

function gerarSlots(inicio = "08:00", fim = "18:00", intervaloMin = 10) {
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

function adicionarMinutos(data: Date, minutos: number) {
  return new Date(data.getTime() + minutos * 60 * 1000)
}

function getDataSaoPaulo(data: Date) {
  return data.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

function getDiaSemana(dataISO: string): number {
  return new Date(dataISO + "T12:00:00").getDay()
}

function getDataHoraInicial() {
  const agoraMais5 = adicionarMinutos(new Date(), 5)
  const hoje = getDataSaoPaulo(agoraMais5)
  const slots = gerarSlots()
  const primeiraHora = slots.find((h) => new Date(`${hoje}T${h}:00-03:00`) > agoraMais5)
  if (primeiraHora) return { data: hoje, hora: primeiraHora }
  return { data: getDataSaoPaulo(adicionarMinutos(agoraMais5, 24 * 60)), hora: slots[0] }
}

function formatarTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 11)
  if (nums.length <= 2) return nums.length ? `(${nums}` : ""
  if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`
  return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`
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
      innerRef.current.style.transform = `translateY(${-currentIdx * ITEM_H - ITEM_H / 2}px)`
    }
  }, [currentIdx])

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
    <div ref={outerRef}
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
      <div ref={innerRef} style={{ display: "flex", flexDirection: "column", transform: `translateY(${-currentIdx * ITEM_H - ITEM_H / 2}px)` }}>
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

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

async function buscarCep(nums: string, setRua: (v: string) => void, setBairro: (v: string) => void, setCidade: (v: string) => void) {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
    const data = await res.json()
    if (!data.erro) {
      setRua(data.logradouro || "")
      setBairro(data.bairro || "")
      setCidade(data.localidade || "")
    }
  } catch {}
}

function CamposEndereco({ cep, setCep, rua, setRua, numero, setNumero, bairro, setBairro, cidade, setCidade, buscandoCep, setBuscandoCep }: {
  cep: string; setCep: (v: string) => void
  rua: string; setRua: (v: string) => void
  numero: string; setNumero: (v: string) => void
  bairro: string; setBairro: (v: string) => void
  cidade: string; setCidade: (v: string) => void
  buscandoCep: boolean; setBuscandoCep: (v: boolean) => void
}) {
  async function handleCep(valor: string) {
    const nums = valor.replace(/\D/g, "").slice(0, 8)
    setCep(nums.length > 5 ? `${nums.slice(0, 5)}-${nums.slice(5)}` : nums)
    if (nums.length === 8) {
      setBuscandoCep(true)
      await buscarCep(nums, setRua, setBairro, setCidade)
      setBuscandoCep(false)
    }
  }
  return (
    <>
      <div>
        <label className="text-zinc-400 text-xs mb-1 block">CEP *</label>
        <div className="relative">
          <input value={cep} onChange={(e) => handleCep(e.target.value)}
            required placeholder="00000-000" maxLength={9} className={inputCls} />
          {buscandoCep && <span className="absolute right-3 top-2.5 text-zinc-500 text-xs">buscando...</span>}
        </div>
      </div>
      <div>
        <label className="text-zinc-400 text-xs mb-1 block">Rua / Logradouro *</label>
        <input value={rua} onChange={(e) => setRua(e.target.value)} required placeholder="Ex: Rua das Flores" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-zinc-400 text-xs mb-1 block">Número *</label>
          <input value={numero} onChange={(e) => setNumero(e.target.value)} required placeholder="123" className={inputCls} />
        </div>
        <div>
          <label className="text-zinc-400 text-xs mb-1 block">Bairro *</label>
          <input value={bairro} onChange={(e) => setBairro(e.target.value)} required placeholder="Ex: Centro" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="text-zinc-400 text-xs mb-1 block">Cidade *</label>
        <input value={cidade} onChange={(e) => setCidade(e.target.value)} required placeholder="Ex: São Paulo" className={inputCls} />
      </div>
    </>
  )
}

// Mini calendário inline
function MiniCalendar({ value, onChange, min, max }: {
  value: string; onChange: (v: string) => void; min?: string; max?: string
}) {
  const parseDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return { y, m: m - 1, d } }
  const sel = parseDate(value)
  const [view, setView] = useState({ y: sel.y, m: sel.m })
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })

  useEffect(() => {
    const p = parseDate(value); setView({ y: p.y, m: p.m })
  }, [value])

  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  const semana = ["D","S","T","Q","Q","S","S"]
  const firstDay = new Date(view.y, view.m, 1).getDay()
  const diasNoMes = new Date(view.y, view.m + 1, 0).getDate()

  function navMes(delta: number) {
    setView(v => {
      let m = v.m + delta, y = v.y
      if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
      return { y, m }
    })
  }

  function selecionarDia(d: number) {
    const dateStr = `${view.y}-${String(view.m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
    if (min && dateStr < min) return
    if (max && dateStr > max) return
    onChange(dateStr)
  }

  return (
    <div className="bg-zinc-800 rounded-xl p-2.5 select-none" style={{ width: 190 }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <button type="button" onClick={() => navMes(-1)} className="text-zinc-400 hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center">‹</button>
        <span className="text-white text-xs font-medium">{meses[view.m]} {view.y}</span>
        <button type="button" onClick={() => navMes(1)} className="text-zinc-400 hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {semana.map((d, i) => <div key={i} className="text-zinc-600 text-xs text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
        {[...Array(diasNoMes)].map((_, i) => {
          const d = i + 1
          const dateStr = `${view.y}-${String(view.m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
          const isSelected = dateStr === value
          const isToday = dateStr === today
          const isDisabled = (min && dateStr < min) || (max && dateStr > max)
          return (
            <button key={d} type="button" onClick={() => selecionarDia(d)}
              disabled={!!isDisabled}
              className={`text-xs py-1 rounded text-center transition-colors ${
                isSelected ? "bg-amber-500 text-black font-bold" :
                isToday ? "text-amber-400 font-semibold" :
                isDisabled ? "text-zinc-700 cursor-not-allowed" :
                "text-zinc-300 hover:bg-zinc-700"
              }`}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Modal de cadastro rápido de cliente
function ModalCadastroCliente({ telefone, onSalvo, onCancelar }: {
  telefone: string
  onSalvo: (cliente: any) => void
  onCancelar: () => void
}) {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [cep, setCep] = useState("")
  const [rua, setRua] = useState("")
  const [numero, setNumero] = useState("")
  const [bairro, setBairro] = useState("")
  const [cidade, setCidade] = useState("")
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvando(true)
    setErro("")
    try {
      const nums = telefone.replace(/\D/g, "")
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome, phone: "+55" + nums, email: email || null,
          homeZipCode: cep.replace(/\D/g, "") || null,
          homeAddress: rua || null, homeNumber: numero || null,
          homeNeighborhood: bairro || null, homeCity: cidade || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || "Erro ao salvar."); return }
      onSalvo(data)
    } catch { setErro("Erro inesperado.") }
    finally { setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div>
            <h2 className="text-white font-bold">Novo Cliente</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Telefone: {telefone}</p>
          </div>
          <button onClick={onCancelar} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={handleSalvar} className="p-5 space-y-3">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Nome completo *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase()))}
              required placeholder="Ex: João Silva" autoFocus className={inputCls} />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              placeholder="email@exemplo.com" className={inputCls} />
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider pt-1">Endereço</p>
          <CamposEndereco {...{ cep, setCep, rua, setRua, numero, setNumero, bairro, setBairro, cidade, setCidade, buscandoCep, setBuscandoCep }} />
          {erro && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erro}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancelar}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              {salvando ? "Salvando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para cadastrar endereço de cliente existente (exigido para domicílio)
function ModalCadastroEndereco({ clienteId, clienteNome, onSalvo, onCancelar }: {
  clienteId: string
  clienteNome: string
  onSalvo: (cliente: any) => void
  onCancelar: () => void
}) {
  const [cep, setCep] = useState("")
  const [rua, setRua] = useState("")
  const [numero, setNumero] = useState("")
  const [bairro, setBairro] = useState("")
  const [cidade, setCidade] = useState("")
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvando(true)
    setErro("")
    try {
      const res = await fetch(`/api/clientes/${clienteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeZipCode: cep.replace(/\D/g, "") || null,
          homeAddress: rua || null, homeNumber: numero || null,
          homeNeighborhood: bairro || null, homeCity: cidade || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || "Erro ao salvar."); return }
      onSalvo(data)
    } catch { setErro("Erro inesperado.") }
    finally { setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div>
            <h2 className="text-white font-bold">Endereço para Domicílio</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{clienteNome}</p>
          </div>
          <button onClick={onCancelar} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={handleSalvar} className="p-5 space-y-3">
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2 text-teal-400 text-xs">
            Para agendamentos a domicílio, o cliente precisa ter endereço cadastrado.
          </div>
          <CamposEndereco {...{ cep, setCep, rua, setRua, numero, setNumero, bairro, setBairro, cidade, setCidade, buscandoCep, setBuscandoCep }} />
          {erro && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erro}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancelar}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              {salvando ? "Salvando..." : "Salvar endereço"}
            </button>
          </div>
        </form>
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
  const [businessHours, setBusinessHours] = useState<any[]>([])
  const [regrasPrecificacao, setRegrasPrecificacao] = useState<any[]>([])
  const [haircuts, setHaircuts] = useState<any[]>([])
  const [haircutId, setHaircutId] = useState("")

  const inicial = getDataHoraInicial()
  const hojeISO = getDataSaoPaulo(new Date())
  const maxDataISO = getDataSaoPaulo(adicionarMinutos(new Date(), 5 * 24 * 60))

  const [dataSelecionada, setDataSelecionada] = useState(inicial.data)
  const [hora, setHora] = useState(inicial.hora)
  const [clienteId, setClienteId] = useState("")
  const [servicoId, setServicoId] = useState("")
  const [profId, setProfId] = useState("")
  const [tipoAtendimento, setTipoAtendimento] = useState("presencial")

  // Telefone para busca de cliente
  const [telefone, setTelefone] = useState("")
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [clienteNome, setClienteNome] = useState("")
  const [clienteObj, setClienteObj] = useState<any | null>(null)
  const [mostrarCadastro, setMostrarCadastro] = useState(false)
  const [mostrarCadastroEndereco, setMostrarCadastroEndereco] = useState(false)

  // Profissional selecionado completo (com schedules e userServices)
  const profSelecionado = profissionais.find(p => p.id === profId)
  const descansoMin = profSelecionado?.breakBetweenAppts ?? 10

  // Filtra profissionais por tipo de atendimento (apenas ativos)
  const profissionaisFiltrados = profissionais.filter(p =>
    p.isActive !== false &&
    (tipoAtendimento === "domicilio" ? p.attendsHome === true : true)
  )

  // Horários da barbearia para o dia selecionado
  const diaSemana = getDiaSemana(dataSelecionada)
  const horaEstab = businessHours.find((d: any) => d.dayOfWeek === diaSemana)
  const estabAberto = !businessHours.length || (horaEstab?.isOpen !== false)
  const inicioEstab = horaEstab?.startTime || "08:00"
  const fimEstab = horaEstab?.endTime || "22:00"

  // Verifica se o profissional atende no dia selecionado
  const schedulesDoDia = profSelecionado?.schedules?.find((s: any) => s.dayOfWeek === diaSemana)
  const profAtendeDia = estabAberto && (!profId || !profSelecionado?.schedules?.length || (schedulesDoDia?.isActive === true))

  // Horários do profissional limitados pelos horários da barbearia
  const inicioProf = schedulesDoDia?.startTime || inicioEstab
  const fimProf = schedulesDoDia?.endTime || fimEstab
  // Interseção: começa no mais tarde dos dois, termina no mais cedo dos dois
  const inicioEfetivo = inicioProf > inicioEstab ? inicioProf : inicioEstab
  const fimEfetivo = fimProf < fimEstab ? fimProf : fimEstab

  // Gera slots respeitando ambos os horários
  const horasBase = estabAberto
    ? (profId && profSelecionado?.schedules?.length && schedulesDoDia?.isActive
        ? gerarSlots(inicioEfetivo, fimEfetivo, 10)
        : gerarSlots(inicioEstab, fimEstab, 10))
    : []

  // Serviços filtrados pelo profissional selecionado
  const servicosFiltrados = (() => {
    if (!profId || !profSelecionado) return []
    const idsDoProf = profSelecionado.userServices?.map((us: any) => us.serviceId) || []
    const doProf = idsDoProf.length > 0 ? servicos.filter(s => idsDoProf.includes(s.id)) : servicos
    const ativos = doProf.filter(s => s.isActive !== false)
    if (tipoAtendimento === "domicilio") return ativos.filter(s => s.availableHome === true)
    return ativos
  })()

  function precoAjustado(preco: number): number {
    const diaSemana = getDiaSemana(dataSelecionada)
    const [hh, mm] = hora ? hora.split(":").map(Number) : [0, 0]
    const horaMin = hh * 60 + mm
    let netMarkup = 0
    let netDesconto = 0
    for (const regra of regrasPrecificacao) {
      if (!regra.isActive) continue
      if (!Array.isArray(regra.daysOfWeek) || !regra.daysOfWeek.includes(diaSemana)) continue
      if (regra.startTime && regra.endTime) {
        const [sh, sm] = regra.startTime.split(":").map(Number)
        const [eh, em] = regra.endTime.split(":").map(Number)
        if (horaMin < sh * 60 + sm || horaMin >= eh * 60 + em) continue
      }
      netMarkup += regra.markupPct || 0
      netDesconto += regra.discountPct || 0
    }
    const netPct = netMarkup - netDesconto
    if (!netPct) return preco
    return preco * (1 + netPct / 100)
  }

  const servicoSelecionado = servicos.find((s) => s.id === servicoId)
  const duracaoTotal = (servicoSelecionado?.durationMin || 30) + descansoMin

  const horariosDisponiveis = horasBase.filter((h) => {
    if (!profAtendeDia) return false
    const inicioNovo = new Date(`${dataSelecionada}T${h}:00-03:00`)
    const fimNovo = adicionarMinutos(inicioNovo, duracaoTotal)
    const agoraMais5 = adicionarMinutos(new Date(), 5)
    if (inicioNovo <= agoraMais5) return false
    // Início do corte deve ser estritamente antes do encerramento efetivo
    const fimEfetivoDate = new Date(`${dataSelecionada}T${fimEfetivo}:00-03:00`)
    if (inicioNovo >= fimEfetivoDate) return false
    if (!profId || !servicoId) return true
    const temConflito = agendamentos.some((a) => {
      if (a.professionalId !== profId) return false
      if (["CANCELLED", "NO_SHOW", "DONE"].includes(a.status)) return false
      const inicioExistente = new Date(a.scheduledAt)
      const fimExistente = adicionarMinutos(inicioExistente, (a.service?.durationMin || 30) + descansoMin)
      return inicioNovo < fimExistente && fimNovo > inicioExistente
    })
    return !temConflito
  })

  useEffect(() => {
    if (!aberto) return
    // Busca businessHours sempre (independente de dadosPreCarregados)
    fetch("/api/configuracoes").then(r => r.json()).then(d => {
      if (Array.isArray(d?.businessHours)) setBusinessHours(d.businessHours)
    }).catch(() => {})
    fetch("/api/precificacao").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setRegrasPrecificacao(d)
    }).catch(() => {})

    if (dadosPreCarregados) {
      setProfissionais(dadosPreCarregados.profissionais)
      setClientes(dadosPreCarregados.clientes)
      setServicos(dadosPreCarregados.servicos)
      setCarregando(false)
    } else {
      setCarregando(true)
      Promise.all([
        fetch("/api/equipe").then(r => r.json()),
        fetch("/api/clientes?modo=simples").then(r => r.json()),
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

  // Busca agendamentos quando data muda
  useEffect(() => {
    if (!aberto) return
    fetch(`/api/agendamentos?data=${dataSelecionada}`)
      .then(r => r.json())
      .then(appts => setAgendamentos(Array.isArray(appts) ? appts : []))
      .catch(console.error)
  }, [dataSelecionada, aberto])

  useEffect(() => {
    function handleSlotEvento(e: Event) {
      const { hora: h, profId: pid, data: d } = (e as CustomEvent).detail || {}
      if (h) setHora(h)
      if (pid) setProfId(pid)
      if (d) setDataSelecionada(d)
    }
    window.addEventListener("abrirModalAgenda", handleSlotEvento)
    return () => window.removeEventListener("abrirModalAgenda", handleSlotEvento)
  }, [])

  useEffect(() => {
    setServicoId("")
    setProfId("")
  }, [tipoAtendimento])

  useEffect(() => {
    setServicoId("")
    setHaircutId("")
    setHaircuts([])
  }, [profId])

  useEffect(() => {
    setHaircutId("")
    if (!servicoId) { setHaircuts([]); return }
    fetch(`/api/galeria?serviceId=${servicoId}`)
      .then(r => r.json())
      .then(d => setHaircuts(Array.isArray(d) ? d.filter((h: any) => h.isActive !== false && h.photoUrl) : []))
      .catch(() => {})
  }, [servicoId])

  useEffect(() => {
    if (horariosDisponiveis.length > 0 && !horariosDisponiveis.includes(hora)) {
      setHora(horariosDisponiveis[0])
    }
  }, [dataSelecionada, profId, servicoId, horariosDisponiveis, hora])

  // Busca cliente por telefone
  async function handleTelefone(valor: string) {
    const fmt = formatarTelefone(valor)
    setTelefone(fmt)
    setClienteId("")
    setClienteNome("")
    const nums = fmt.replace(/\D/g, "")
    if (nums.length === 11) {
      setBuscandoCliente(true)
      // Busca no cache local primeiro
      const encontrado = clientes.find(c =>
        c.phone?.replace(/\D/g, "") === nums ||
        c.phone?.replace(/\D/g, "") === "55" + nums
      )
      if (encontrado) {
        setClienteId(encontrado.id)
        setClienteNome(encontrado.name)
        setClienteObj(encontrado)
        setBuscandoCliente(false)
        return
      }
      // Fallback: busca na API pelo número
      try {
        const res = await fetch(`/api/clientes?busca=${nums}&page=1&perPage=5`)
        const data = await res.json()
        const lista: any[] = Array.isArray(data.clientes) ? data.clientes : []
        const achado = lista.find((c: any) =>
          c.phone?.replace(/\D/g, "") === nums ||
          c.phone?.replace(/\D/g, "") === "55" + nums
        )
        if (achado) {
          setClientes(prev => prev.some(c => c.id === achado.id) ? prev : [achado, ...prev])
          setClienteId(achado.id)
          setClienteNome(achado.name)
          setClienteObj(achado)
          setBuscandoCliente(false)
          return
        }
      } catch {}
      setMostrarCadastro(true)
      setBuscandoCliente(false)
    }
  }

  function handleClienteCadastrado(novoCliente: any) {
    setClientes(prev => [novoCliente, ...prev])
    setClienteId(novoCliente.id)
    setClienteNome(novoCliente.name)
    setClienteObj(novoCliente)
    setMostrarCadastro(false)
  }

  function handleEnderecoSalvo(clienteAtualizado: any) {
    setClientes(prev => prev.map(c => c.id === clienteAtualizado.id ? clienteAtualizado : c))
    setClienteObj(clienteAtualizado)
    setMostrarCadastroEndereco(false)
  }

  function resetar() {
    const i = getDataHoraInicial()
    setDataSelecionada(i.data)
    setHora(i.hora)
    setClienteId("")
    setClienteNome("")
    setClienteObj(null)
    setTelefone("")
    setServicoId("")
    setProfId("")
    setTipoAtendimento("presencial")
    setHaircutId("")
    setHaircuts([])
  }

  const clienteTemEndereco = !clienteObj || !!clienteObj.homeAddress

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvando(true)
    try {
      const scheduledAt = new Date(`${dataSelecionada}T${hora}:00-03:00`)
      const payload = {
        clientId: clienteId,
        professionalId: profId,
        serviceId: servicoId,
        haircutId: haircutId || null,
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

  if (!aberto) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
            <h2 className="text-white font-bold">Novo Agendamento</h2>
            <button onClick={onFechar} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
          </div>

          {carregando ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
          ) : (
            <form onSubmit={handleSalvar} className="p-5 space-y-3">

              {/* Tipo de atendimento */}
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Tipo de atendimento</label>
                <div className="grid grid-cols-2 gap-2">
                  <div onClick={() => setTipoAtendimento("presencial")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${tipoAtendimento === "presencial" ? "border-amber-500/30 bg-amber-500/10" : "border-zinc-700 bg-zinc-800"}`}>
                    <span className={`text-xs font-medium ${tipoAtendimento === "presencial" ? "text-amber-400" : "text-zinc-400"}`}>🏪 Presencial</span>
                  </div>
                  <div onClick={() => setTipoAtendimento("domicilio")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${tipoAtendimento === "domicilio" ? "border-teal-500/30 bg-teal-500/10" : "border-zinc-700 bg-zinc-800"}`}>
                    <span className={`text-xs font-medium ${tipoAtendimento === "domicilio" ? "text-teal-400" : "text-zinc-400"}`}>🚗 Domicílio</span>
                  </div>
                </div>
              </div>

              {/* Telefone — busca cliente */}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Telefone do cliente *</label>
                <div className="relative">
                  <input value={telefone} onChange={(e) => handleTelefone(e.target.value)}
                    placeholder="(11) 99999-9999" required
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                  {buscandoCliente && <span className="absolute right-3 top-2.5 text-zinc-500 text-xs">buscando...</span>}
                </div>
                {clienteNome && (
                  <div className="mt-1.5 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-green-400 text-sm font-medium">{clienteNome}</span>
                    <button type="button" onClick={() => { setClienteId(""); setClienteNome(""); setTelefone("") }}
                      className="text-zinc-500 hover:text-zinc-300 text-xs">trocar</button>
                  </div>
                )}
              </div>

              {/* Profissional */}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Profissional *</label>
                <select value={profId} onChange={(e) => setProfId(e.target.value)} required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                  <option value="">Selecionar profissional...</option>
                  {profissionaisFiltrados.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {tipoAtendimento === "domicilio" && profissionaisFiltrados.length === 0 && (
                  <p className="text-amber-400 text-xs mt-1">Nenhum profissional cadastrado para atendimento a domicílio.</p>
                )}
              </div>

              {/* Serviço — dependente do profissional */}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Serviço *</label>
                <select value={servicoId} onChange={(e) => setServicoId(e.target.value)} required
                  disabled={!profId}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors disabled:opacity-50">
                  <option value="">{profId ? "Selecionar serviço..." : "Selecione um profissional primeiro"}</option>
                  {servicosFiltrados.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — R$ {precoAjustado(s.price).toFixed(2)} · {s.durationMin}min
                    </option>
                  ))}
                </select>
                {profId && servicosFiltrados.length === 0 && (
                  <p className="text-zinc-500 text-xs mt-1">Nenhum serviço vinculado a este profissional.</p>
                )}
              </div>

              {/* Galeria de cortes — aparece quando o serviço tem fotos cadastradas */}
              {haircuts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-zinc-400 text-xs">Estilo do corte <span className="text-zinc-600">(opcional)</span></label>
                    {haircutId && (
                      <button type="button" onClick={() => setHaircutId("")}
                        className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">limpar</button>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {haircuts.map(h => (
                      <button key={h.id} type="button"
                        onClick={() => setHaircutId(prev => prev === h.id ? "" : h.id)}
                        className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                          haircutId === h.id
                            ? "border-amber-500 ring-1 ring-amber-500/40"
                            : "border-zinc-700 hover:border-zinc-500"
                        }`}
                        style={{ width: 88 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={h.photoUrl} alt={h.name} className="w-full object-cover" style={{ height: 100 }} />
                        <div className={`px-1.5 py-1.5 text-center ${haircutId === h.id ? "bg-amber-500/20" : "bg-zinc-800"}`}>
                          <div className={`text-xs font-medium truncate ${haircutId === h.id ? "text-amber-300" : "text-zinc-300"}`}>
                            {h.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data + Horário lado a lado */}
              <div className="flex gap-3 items-start">
                {/* Calendário */}
                <div>
                  <label className="text-zinc-400 text-xs mb-1.5 block">Data *</label>
                  <MiniCalendar value={dataSelecionada} onChange={setDataSelecionada} min={hojeISO} max={maxDataISO} />
                  {profId && !profAtendeDia && (
                    <p className="text-red-400 text-xs mt-1">{profSelecionado?.name?.split(" ")[0]} não atende neste dia.</p>
                  )}
                </div>

                {/* Horário */}
                <div className="flex-1">
                  <label className="text-zinc-400 text-xs mb-1.5 block">Horário *</label>
                  {!profAtendeDia ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-2 text-red-400 text-xs">
                      Prof. não atende neste dia.
                    </div>
                  ) : horariosDisponiveis.length === 0 ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-2 text-red-400 text-xs">
                      Sem horários disponíveis.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <WheelPicker
                          items={[...new Set(horariosDisponiveis.map(h => h.split(":")[0]))]}
                          value={hora.split(":")[0]}
                          onChange={(h) => {
                            const mins = horariosDisponiveis.filter(s => s.startsWith(h + ":")).map(s => s.split(":")[1])
                            const newMin = mins.includes(hora.split(":")[1]) ? hora.split(":")[1] : mins[0]
                            setHora(`${h}:${newMin ?? "00"}`)
                          }}
                        />
                        <span className="text-white text-xl font-bold">:</span>
                        <WheelPicker
                          items={horariosDisponiveis.filter(s => s.startsWith(hora.split(":")[0] + ":")).map(s => s.split(":")[1])}
                          value={hora.split(":")[1]}
                          onChange={(m) => setHora(`${hora.split(":")[0]}:${m}`)}
                        />
                      </div>
                      <span className="text-amber-400 text-sm font-bold">{hora}</span>
                    </div>
                  )}
                </div>
              </div>

              {tipoAtendimento === "domicilio" && clienteId && !clienteTemEndereco && (
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-teal-400 text-xs">Cliente sem endereço cadastrado</span>
                  <button type="button" onClick={() => setMostrarCadastroEndereco(true)}
                    className="text-xs text-teal-300 font-medium underline whitespace-nowrap">
                    Cadastrar endereço
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onFechar}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  disabled={salvando || horariosDisponiveis.length === 0 || !profAtendeDia || !clienteId || (tipoAtendimento === "domicilio" && !clienteTemEndereco)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvando ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal de cadastro rápido */}
      {mostrarCadastro && (
        <ModalCadastroCliente
          telefone={telefone}
          onSalvo={handleClienteCadastrado}
          onCancelar={() => { setMostrarCadastro(false); setTelefone("") }}
        />
      )}

      {/* Modal de endereço para domicílio */}
      {mostrarCadastroEndereco && clienteId && (
        <ModalCadastroEndereco
          clienteId={clienteId}
          clienteNome={clienteNome}
          onSalvo={handleEnderecoSalvo}
          onCancelar={() => setMostrarCadastroEndereco(false)}
        />
      )}
    </>
  )
}