"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

function formatarTelefone(v: string) {
  const n = v.replace(/\D/g, "").slice(0, 11)
  if (n.length <= 2) return n.length ? `(${n}` : ""
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

function getDiaSemana(dataISO: string) {
  return new Date(dataISO + "T12:00:00").getDay()
}

function getHoje() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

type Estabelecimento = {
  id: string
  name: string
  logoUrl: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  businessHours: any[]
  services: { id: string; name: string; price: number; durationMin: number; photoUrl: string | null; availableHome: boolean }[]
  users: { id: string; name: string; attendsHome: boolean; userServices: { serviceId: string }[] }[]
}

type Cliente = { id: string; name: string; phone: string }

type Step = "telefone" | "cadastro" | "servico" | "profissional" | "data" | "hora" | "confirmado"

export default function AgendarPage() {
  const { slug } = useParams<{ slug: string }>()

  const [estab, setEstab] = useState<Estabelecimento | null>(null)
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(true)

  // Fluxo
  const [step, setStep] = useState<Step>("telefone")

  // Dados coletados
  const [telefone, setTelefone] = useState("")
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [nomeNovo, setNomeNovo] = useState("")
  const [emailNovo, setEmailNovo] = useState("")
  const [tipoAtendimento, setTipoAtendimento] = useState<"presencial" | "domicilio">("presencial")
  const [servicoId, setServicoId] = useState("")
  const [profId, setProfId] = useState("")
  const [data, setData] = useState(getHoje())
  const [hora, setHora] = useState("")
  const [horarios, setHorarios] = useState<string[]>([])
  const [buscandoHorarios, setBuscandoHorarios] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [agendamentoFeito, setAgendamentoFeito] = useState<any>(null)
  const [fotoAberta, setFotoAberta] = useState(false)

  // Carrega estabelecimento
  useEffect(() => {
    if (!slug) return
    fetch(`/api/public/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro(d.error); return }
        setEstab(d)
      })
      .catch(() => setErro("Erro ao carregar estabelecimento"))
      .finally(() => setCarregando(false))
  }, [slug])

  // Carrega horários disponíveis
  useEffect(() => {
    if (!estab || !profId || !servicoId || !data) { setHorarios([]); return }
    setBuscandoHorarios(true)
    fetch(`/api/public/horarios?estabId=${estab.id}&profId=${profId}&data=${data}&serviceId=${servicoId}`)
      .then(r => r.json())
      .then(d => setHorarios(Array.isArray(d) ? d : []))
      .catch(() => setHorarios([]))
      .finally(() => setBuscandoHorarios(false))
  }, [estab, profId, servicoId, data])

  async function handleTelefone() {
    if (!estab) return
    const nums = telefone.replace(/\D/g, "")
    if (nums.length < 10) return

    const r = await fetch(`/api/public/cliente?phone=${nums}&estabId=${estab.id}`)
    const c = await r.json()
    if (c?.id) {
      setCliente(c)
      setStep("servico")
    } else {
      setStep("cadastro")
    }
  }

  async function handleCadastro() {
    if (!estab || !nomeNovo.trim()) return
    setSalvando(true)
    const r = await fetch("/api/public/cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nomeNovo.trim(), phone: telefone.replace(/\D/g, ""), email: emailNovo || undefined, estabId: estab.id }),
    })
    const c = await r.json()
    setSalvando(false)
    if (c?.id) { setCliente(c); setStep("servico") }
  }

  async function handleConfirmar() {
    if (!estab || !cliente || !servicoId || !profId || !hora) return
    setSalvando(true)
    const r = await fetch("/api/public/agendamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId: cliente.id, profId, servicoId, data, hora, estabId: estab.id, tipoAtendimento }),
    })
    const d = await r.json()
    setSalvando(false)
    if (d.ok) { setAgendamentoFeito(d.agendamento); setStep("confirmado") }
    else setErro(d.error || "Erro ao criar agendamento")
  }

  const servicoSelecionado = estab?.services.find(s => s.id === servicoId)
  const profSelecionado = estab?.users.find(u => u.id === profId)

  const servicosFiltrados = estab?.services.filter(s =>
    tipoAtendimento === "domicilio" ? s.availableHome : true
  ) ?? []

  const profsFiltrados = estab?.users.filter(u => {
    if (!servicoId) return true
    const vinculado = u.userServices.length === 0 || u.userServices.some(us => us.serviceId === servicoId)
    if (tipoAtendimento === "domicilio") return vinculado && u.attendsHome
    return vinculado
  }) ?? []

  const diasAbertos: number[] = estab
    ? (estab.businessHours as any[]).filter((d: any) => d.isOpen).map((d: any) => d.dayOfWeek)
    : []

  function dataIsValida(d: string) {
    const dia = getDiaSemana(d)
    const hoje = getHoje()
    return d >= hoje && diasAbertos.includes(dia)
  }

  if (carregando) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (erro && !estab) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-zinc-400 text-lg">{erro}</p>
      </div>
    </div>
  )

  if (!estab) return null

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex items-center gap-3">
        {estab.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={estab.logoUrl} alt={estab.name} className="w-10 h-10 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-white font-semibold text-base leading-tight">{estab.name}</h1>
          {estab.city && <p className="text-zinc-400 text-xs">{estab.city}{estab.state ? `, ${estab.state}` : ""}</p>}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">

        {/* Confirmado */}
        {step === "confirmado" && agendamentoFeito && (
          <div className="text-center space-y-4 pt-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Agendado!</h2>
              <p className="text-zinc-400 text-sm mt-1">
                {agendamentoFeito.service?.name} com {agendamentoFeito.professional?.name}
              </p>
              <p className="text-amber-400 font-medium mt-1">
                {new Date(agendamentoFeito.scheduledAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
            <button
              onClick={() => { setStep("telefone"); setCliente(null); setTelefone(""); setServicoId(""); setProfId(""); setHora(""); setAgendamentoFeito(null) }}
              className="text-zinc-400 text-sm underline underline-offset-2 hover:text-white transition-colors">
              Fazer outro agendamento
            </button>
          </div>
        )}

        {/* Passo: telefone */}
        {step === "telefone" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Agendar horário</h2>
              <p className="text-zinc-400 text-sm mt-1">Digite seu telefone para começar</p>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Telefone / WhatsApp</label>
              <input
                type="tel"
                value={telefone}
                onChange={e => setTelefone(formatarTelefone(e.target.value))}
                onKeyDown={e => e.key === "Enter" && handleTelefone()}
                placeholder="(00) 00000-0000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              onClick={handleTelefone}
              disabled={telefone.replace(/\D/g, "").length < 10}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-xl py-3 transition-colors">
              Continuar
            </button>
          </div>
        )}

        {/* Passo: cadastro */}
        {step === "cadastro" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Primeiro acesso</h2>
              <p className="text-zinc-400 text-sm mt-1">Não encontramos seu cadastro. Informe seu nome:</p>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Nome completo *</label>
              <input
                type="text"
                value={nomeNovo}
                onChange={e => setNomeNovo(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">E-mail (opcional)</label>
              <input
                type="email"
                value={emailNovo}
                onChange={e => setEmailNovo(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("telefone")}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl py-3 transition-colors">
                Voltar
              </button>
              <button
                onClick={handleCadastro}
                disabled={!nomeNovo.trim() || salvando}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-xl py-3 transition-colors">
                {salvando ? "Salvando..." : "Continuar"}
              </button>
            </div>
          </div>
        )}

        {/* Passo: serviço */}
        {step === "servico" && (
          <div className="space-y-4">
            <div>
              <p className="text-zinc-400 text-sm">Olá, <span className="text-white font-medium">{cliente?.name}</span>!</p>
              <h2 className="text-white font-semibold text-lg mt-0.5">Escolha o serviço</h2>
            </div>

            {/* Tipo de atendimento */}
            {estab.users.some(u => u.attendsHome) && (
              <div className="flex gap-2">
                {(["presencial", "domicilio"] as const).map(tipo => (
                  <button key={tipo} type="button"
                    onClick={() => { setTipoAtendimento(tipo); setServicoId("") }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${tipoAtendimento === tipo ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                    {tipo === "presencial" ? "Na barbearia" : "Em domicílio"}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {servicosFiltrados.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { setServicoId(s.id); setProfId(""); setHora("") }}
                  className={`w-full flex items-center justify-between rounded-xl border p-4 transition-all ${servicoId === s.id ? "border-amber-500 bg-amber-500/10" : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"}`}>
                  <div className="flex items-center gap-3">
                    {s.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photoUrl} alt={s.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <span className={`font-medium text-sm ${servicoId === s.id ? "text-amber-300" : "text-white"}`}>{s.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className={`text-sm font-semibold ${servicoId === s.id ? "text-amber-400" : "text-zinc-300"}`}>
                      R$ {s.price.toFixed(2)}
                    </div>
                    <div className="text-zinc-500 text-xs">{s.durationMin}min</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("profissional")}
              disabled={!servicoId}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-xl py-3 transition-colors">
              Continuar
            </button>
          </div>
        )}

        {/* Passo: profissional */}
        {step === "profissional" && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg">Escolha o profissional</h2>
            <div className="space-y-2">
              {profsFiltrados.map(p => (
                <button key={p.id} type="button"
                  onClick={() => { setProfId(p.id); setHora("") }}
                  className={`w-full flex items-center gap-3 rounded-xl border p-4 transition-all ${profId === p.id ? "border-amber-500 bg-amber-500/10" : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"}`}>
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-300 text-sm font-medium">{p.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className={`font-medium text-sm ${profId === p.id ? "text-amber-300" : "text-white"}`}>{p.name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("servico")}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl py-3 transition-colors">
                Voltar
              </button>
              <button onClick={() => setStep("data")} disabled={!profId}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-xl py-3 transition-colors">
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Passo: data */}
        {step === "data" && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg">Escolha a data</h2>
            <input
              type="date"
              value={data}
              min={getHoje()}
              onChange={e => { setData(e.target.value); setHora("") }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition-colors"
            />
            {data && !dataIsValida(data) && (
              <p className="text-red-400 text-xs">Este dia está fechado. Escolha outro.</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep("profissional")}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl py-3 transition-colors">
                Voltar
              </button>
              <button onClick={() => setStep("hora")} disabled={!data || !dataIsValida(data)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-xl py-3 transition-colors">
                Ver horários
              </button>
            </div>
          </div>
        )}

        {/* Passo: hora */}
        {step === "hora" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Escolha o horário</h2>
              <p className="text-zinc-400 text-xs mt-0.5">
                {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
            </div>
            {buscandoHorarios ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : horarios.length === 0 ? (
              <p className="text-zinc-400 text-sm text-center py-6">Nenhum horário disponível neste dia.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {horarios.map(h => (
                  <button key={h} type="button"
                    onClick={() => setHora(h)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${hora === h ? "bg-amber-500 border-amber-500 text-black" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-500 hover:text-amber-400"}`}>
                    {h}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep("data")}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl py-3 transition-colors">
                Voltar
              </button>
              <button onClick={handleConfirmar} disabled={!hora || salvando}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-xl py-3 transition-colors">
                {salvando ? "Agendando..." : "Confirmar"}
              </button>
            </div>
            {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}
          </div>
        )}

        {/* Resumo lateral enquanto preenche */}
        {["profissional", "data", "hora"].includes(step) && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-sm space-y-1">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Resumo</p>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Cliente</span>
              <span className="text-white">{cliente?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Serviço</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white">{servicoSelecionado?.name}</span>
                {servicoSelecionado?.photoUrl && (
                  <button type="button" onClick={() => setFotoAberta(true)}
                    className="text-amber-400 hover:text-amber-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {profSelecionado && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Profissional</span>
                <span className="text-white">{profSelecionado.name}</span>
              </div>
            )}
            {step !== "profissional" && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Data</span>
                <span className="text-white">
                  {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox foto do serviço */}
      {fotoAberta && servicoSelecionado?.photoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setFotoAberta(false)}>
          <div className="max-w-sm w-full mx-4 rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={servicoSelecionado.photoUrl} alt={servicoSelecionado.name} className="w-full object-cover max-h-72" />
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-white font-medium text-sm">{servicoSelecionado.name}</span>
              <button onClick={() => setFotoAberta(false)} className="text-zinc-400 hover:text-white text-xs">fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
