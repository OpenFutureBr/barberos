"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/DashboardLayout"

const paises = [
  { codigo: "+55", sigla: "BR", mascara: "(XX) XXXXX-XXXX", digitos: 11 },
  { codigo: "+1",  sigla: "US", mascara: "(XXX) XXX-XXXX",  digitos: 10 },
  { codigo: "+351",sigla: "PT", mascara: "XXX XXX XXX",     digitos: 9  },
  { codigo: "+54", sigla: "AR", mascara: "(XX) XXXX-XXXX",  digitos: 10 },
  { codigo: "+598",sigla: "UY", mascara: "XXXX XXXX",       digitos: 8  },
]

function formatarTelefone(valor: string, digitos: number): string {
  const nums = valor.replace(/\D/g, "").slice(0, digitos)
  if (digitos === 11) {
    if (nums.length <= 2) return nums.length ? `(${nums}` : ""
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`
    return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`
  }
  if (digitos === 10) {
    if (nums.length <= 3) return nums.length ? `(${nums}` : ""
    if (nums.length <= 6) return `(${nums.slice(0,3)}) ${nums.slice(3)}`
    return `(${nums.slice(0,3)}) ${nums.slice(3,6)}-${nums.slice(6)}`
  }
  return nums
}

function calcularIdade(birthDate: string | null) {
  if (!birthDate) return null
  const hoje = new Date()
  const nasc = new Date(birthDate)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function ClientePerfilPage() {
  const { id } = useParams()
  const router = useRouter()
  const [aba, setAba] = useState<"perfil" | "historico" | "financeiro">("perfil")
  const [apptExpandido, setApptExpandido] = useState<string | null>(null)
  const [historicoTake, setHistoricoTake] = useState(10)
  const [financeiroTake, setFinanceiroTake] = useState(10)
  const [cliente, setCliente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  // Modal editar
  const [modalEditar, setModalEditar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroEditar, setErroEditar] = useState("")
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [paisIdx, setPaisIdx] = useState(0)
  const [email, setEmail] = useState("")
  const [nascimento, setNascimento] = useState("")
  const [cep, setCep] = useState("")
  const [rua, setRua] = useState("")
  const [numero, setNumero] = useState("")
  const [bairro, setBairro] = useState("")
  const [cidade, setCidade] = useState("")
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Modal excluir
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const pais = paises[paisIdx]

  useEffect(() => { buscarCliente() }, [id])

  async function buscarCliente() {
    setLoading(true)
    try {
      const res = await fetch(`/api/clientes/${id}`)
      if (!res.ok) { setErro("Cliente não encontrado"); return }
      const data = await res.json()
      setCliente(data)
    } catch {
      setErro("Erro ao carregar cliente")
    } finally {
      setLoading(false)
    }
  }

  function abrirEditar() {
    if (!cliente) return
    setNome(cliente.name || "")
    setEmail(cliente.email || "")
    setNascimento(cliente.birthDate ? cliente.birthDate.split("T")[0] : "")
    setCep(cliente.homeZipCode || "")
    setRua(cliente.homeAddress || "")
    setNumero(cliente.homeNumber || "")
    setBairro(cliente.homeNeighborhood || "")
    setCidade(cliente.homeCity || "")
    // detecta país pelo telefone
    const phone = cliente.phone || ""
    if (phone.startsWith("+55")) { setPaisIdx(0); setTelefone(formatarTelefone(phone.slice(3), 11)) }
    else if (phone.startsWith("+1")) { setPaisIdx(1); setTelefone(formatarTelefone(phone.slice(2), 10)) }
    else if (phone.startsWith("+351")) { setPaisIdx(2); setTelefone(formatarTelefone(phone.slice(4), 9)) }
    else if (phone.startsWith("+54")) { setPaisIdx(3); setTelefone(formatarTelefone(phone.slice(3), 10)) }
    else if (phone.startsWith("+598")) { setPaisIdx(4); setTelefone(formatarTelefone(phone.slice(4), 8)) }
    else setTelefone(phone)
    setErroEditar("")
    setModalEditar(true)
  }

  async function buscarCep(valor: string) {
    const nums = valor.replace(/\D/g, "")
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setRua(data.logradouro || "")
        setBairro(data.bairro || "")
        setCidade(data.localidade || "")
      }
    } catch {} finally { setBuscandoCep(false) }
  }

  function handleCep(valor: string) {
    const nums = valor.replace(/\D/g, "").slice(0, 8)
    const fmt = nums.length > 5 ? `${nums.slice(0,5)}-${nums.slice(5)}` : nums
    setCep(fmt)
    if (nums.length === 8) buscarCep(nums)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    const nums = telefone.replace(/\D/g, "")
    if (nums.length !== pais.digitos) { setErroEditar(`Telefone deve ter ${pais.digitos} dígitos.`); return }
    setSalvando(true)
    setErroEditar("")
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome,
          phone: pais.codigo + nums,
          email: email || null,
          birthDate: nascimento || null,
          homeZipCode: cep.replace(/\D/g, "") || null,
          homeAddress: rua || null,
          homeNumber: numero || null,
          homeNeighborhood: bairro || null,
          homeCity: cidade || null,
        }),
      })
      if (!res.ok) { setErroEditar("Erro ao salvar. Tente novamente."); return }
      await buscarCliente()
      setModalEditar(false)
    } catch { setErroEditar("Erro inesperado.") }
    finally { setSalvando(false) }
  }

  async function handleExcluir() {
    setExcluindo(true)
    try {
      await fetch(`/api/clientes/${id}`, { method: "DELETE" })
      router.push("/dashboard/clientes")
    } catch { setExcluindo(false) }
  }

  if (loading) return (
    <DashboardLayout>
      <div className="animate-pulse space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-zinc-800 rounded-lg w-48" />
            <div className="h-3 bg-zinc-800 rounded w-32" />
            <div className="h-3 bg-zinc-800 rounded w-24" />
          </div>
          <div className="h-8 w-24 bg-zinc-800 rounded-xl" />
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[80, 72, 88].map((w, i) => <div key={i} className="h-8 bg-zinc-800 rounded-xl" style={{ width: w }} />)}
        </div>
        {/* Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-40 bg-zinc-900 border border-zinc-800 rounded-2xl" />
          <div className="h-40 bg-zinc-900 border border-zinc-800 rounded-2xl" />
        </div>
      </div>
    </DashboardLayout>
  )

  if (erro || !cliente) return (
    <DashboardLayout>
      <div className="p-8 text-center">
        <div className="text-zinc-500 text-sm mb-3">{erro || "Cliente não encontrado"}</div>
        <button
          onClick={() => router.push("/dashboard/clientes")}
          className="text-amber-400 text-sm hover:text-amber-300 transition-colors"
        >
          ← Voltar para clientes
        </button>
      </div>
    </DashboardLayout>
  )

  const idade = calcularIdade(cliente.birthDate)
  const agendamentos = cliente.appointments || []
  // Dados físicos — calculados e salvos no momento do pagamento
  const totalGasto = cliente.totalSpent ?? 0
  const ticketMedio = cliente.ticketMedio ?? 0
  const ultimaVisita = cliente.lastVisitAt
    ? new Date(cliente.lastVisitAt).toLocaleDateString("pt-BR")
    : agendamentos[0]?.scheduledAt
      ? new Date(agendamentos[0].scheduledAt).toLocaleDateString("pt-BR")
      : "—"

  return (
    <DashboardLayout>

      {/* Botão voltar */}
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm mb-4 transition-colors">
        ← Voltar
      </button>

      {/* Header do cliente */}
      <div className="flex items-start gap-5 mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="w-16 h-16 rounded-2xl bg-zinc-700 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
          {cliente.name?.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-white text-2xl font-bold">{cliente.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full border ${
              cliente.segment === "VIP" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              cliente.segment === "REGULAR" ? "bg-green-500/10 text-green-400 border-green-500/20" :
              "bg-zinc-700 text-zinc-400 border-zinc-600"
            }`}>
              {cliente.segment === "VIP" ? "★ VIP" : cliente.segment === "REGULAR" ? "Regular" : "Novo"}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              {agendamentos.length} visitas
            </span>
            {cliente.cashbackBalance > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Cashback R$ {cliente.cashbackBalance}
              </span>
            )}
          </div>
<div className="flex flex-wrap gap-4 text-zinc-400 text-sm mb-3">
            {cliente.phone && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
                {cliente.phone}
              </span>
            )}
            {cliente.email && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                {cliente.email}
              </span>
            )}
            {idade && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
                {idade} anos
              </span>
            )}
            {cliente.homeCity && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
                {cliente.homeCity}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("abrirModalAgenda", { detail: {} }))}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
            >
              + Agendar
            </button>
            {cliente.phone && (
              <a
                href={`https://wa.me/${cliente.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-1.5 rounded-lg text-sm border border-green-500/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            )}
            <button
              onClick={abrirEditar}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-1.5 rounded-lg text-sm border border-zinc-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>
              Editar
            </button>
            <button
              onClick={() => setModalExcluir(true)}
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-1.5 rounded-lg text-sm border border-red-500/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
              Excluir
            </button>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-zinc-500 text-xs mb-1">Total gasto</div>
          <div className="text-amber-400 text-2xl font-bold">R$ {totalGasto}</div>
          <div className="text-zinc-600 text-xs mt-1">Ticket médio: R$ {ticketMedio}</div>
          <div className="text-zinc-600 text-xs">Última visita: {ultimaVisita}</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          {
            id: "perfil", label: "Perfil",
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>,
          },
          {
            id: "historico", label: "Histórico",
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>,
          },
          {
            id: "financeiro", label: "Financeiro",
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>,
          },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aba Perfil */}
      {aba === "perfil" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Dados pessoais</div>
            <div className="space-y-0">
              <div className="flex justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-500 text-sm">Nome</span>
                <span className="text-white text-sm font-medium">{cliente.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-500 text-sm">Telefone</span>
                <span className="text-white text-sm">{cliente.phone || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-500 text-sm">Email</span>
                <span className="text-white text-sm">{cliente.email || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-500 text-sm">Nascimento</span>
                <span className="text-white text-sm">
                  {cliente.birthDate ? new Date(cliente.birthDate).toLocaleDateString("pt-BR") : "—"}
                  {idade ? ` (${idade} anos)` : ""}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-500 text-sm">Cadastrado em</span>
                <span className="text-zinc-400 text-sm">{new Date(cliente.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Endereço para domicílio</div>
            {cliente.homeAddress || cliente.homeCity ? (
              <div className="space-y-0">
                {cliente.homeAddress && (
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-500 text-sm">Rua</span>
                    <span className="text-white text-sm">{cliente.homeAddress}{cliente.homeNumber ? `, ${cliente.homeNumber}` : ""}</span>
                  </div>
                )}
                {cliente.homeNeighborhood && (
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-500 text-sm">Bairro</span>
                    <span className="text-white text-sm">{cliente.homeNeighborhood}</span>
                  </div>
                )}
                {cliente.homeCity && (
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-500 text-sm">Cidade</span>
                    <span className="text-white text-sm">{cliente.homeCity}</span>
                  </div>
                )}
                {cliente.homeZipCode && (
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-500 text-sm">CEP</span>
                    <span className="text-white text-sm">{cliente.homeZipCode}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-600 text-sm py-4 text-center">Endereço não cadastrado</div>
            )}
          </div>
        </div>
      )}

      {/* Aba Histórico */}
      {aba === "historico" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
            <span className="text-zinc-500 text-xs">{Math.min(historicoTake, agendamentos.length)} de {agendamentos.length} agendamentos</span>
            <div className="flex items-center gap-0.5 bg-zinc-800 rounded-lg p-0.5">
              {[10, 30, 50, 100].map(n => (
                <button key={n} onClick={() => setHistoricoTake(n)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${historicoTake === n ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {agendamentos.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-sm">Nenhum agendamento encontrado</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Data</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Serviço</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Profissional</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Duração</th>
                  <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.slice(0, historicoTake).map((a: any, i: number) => (
                  <tr key={a.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === Math.min(historicoTake, agendamentos.length) - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3 text-zinc-400 text-sm font-mono">
                      {new Date(a.scheduledAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{a.service?.name || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{a.professional?.name?.split(" ")[0] || "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 text-sm">{a.service?.durationMin || "—"} min</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">
                      R$ {a.service?.price || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Aba Financeiro */}
      {aba === "financeiro" && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 border-t-2 border-t-amber-500">
              <div className="text-zinc-500 text-xs mb-1">Total gasto</div>
              <div className="text-amber-400 text-2xl font-bold">R$ {totalGasto}</div>
              <div className="text-zinc-600 text-xs mt-1">{agendamentos.length} visitas</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 border-t-2 border-t-green-500">
              <div className="text-zinc-500 text-xs mb-1">Cashback acumulado</div>
              <div className="text-green-400 text-2xl font-bold">R$ {cliente.cashbackBalance || 0}</div>
              <div className="text-zinc-600 text-xs mt-1">disponível para resgate</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 border-t-2 border-t-blue-500">
              <div className="text-zinc-500 text-xs mb-1">Ticket médio</div>
              <div className="text-blue-400 text-2xl font-bold">R$ {ticketMedio}</div>
              <div className="text-zinc-600 text-xs mt-1">por visita</div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Pagamentos</div>
              <div className="flex items-center gap-0.5 bg-zinc-800 rounded-lg p-0.5">
                {[10, 30, 50, 100].map(n => (
                  <button key={n} onClick={() => setFinanceiroTake(n)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${financeiroTake === n ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {agendamentos.length === 0 ? (
              <div className="p-6 text-center text-zinc-600 text-sm">Nenhum pagamento</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {agendamentos.slice(0, financeiroTake).map((a: any) => {
                  const produtos = a.produtos ?? []
                  const totalProdutos = produtos.reduce((s: number, m: any) => s + m.quantity * (m.unitPrice ?? m.product?.salePrice ?? 0), 0)
                  const totalAppt = (a.payment?.amount ?? a.service?.price ?? 0)
                  const expandido = apptExpandido === a.id

                  return (
                    <div key={a.id}>
                      {/* Linha clicável */}
                      <button
                        type="button"
                        onClick={() => setApptExpandido(expandido ? null : a.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <div className="text-white text-sm font-medium">
                            {a.service?.name || "—"}
                            {produtos.length > 0 && (
                              <span className="text-zinc-500 font-normal"> + {produtos.length} produto{produtos.length > 1 ? "s" : ""}</span>
                            )}
                          </div>
                          <div className="text-zinc-500 text-xs mt-0.5">
                            {new Date(a.scheduledAt).toLocaleDateString("pt-BR")} · {a.professional?.name?.split(" ")[0]}
                            {a.payment?.method && <span className="ml-1 text-zinc-600">· {a.payment.method}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-amber-400 font-bold font-mono">R$ {totalAppt.toFixed(2)}</div>
                          <span className={`text-zinc-600 text-xs transition-transform ${expandido ? "rotate-90" : ""}`} style={{ display: "inline-block", transition: "transform 0.15s" }}>›</span>
                        </div>
                      </button>

                      {/* Detalhes expandidos */}
                      {expandido && (
                        <div className="bg-zinc-800/40 px-4 pb-3 pt-1 space-y-1.5 border-t border-zinc-800/60">
                          {/* Serviço */}
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">{a.service?.name}</span>
                            <span className="text-white font-mono">R$ {(a.service?.price ?? 0).toFixed(2)}</span>
                          </div>
                          {/* Produtos */}
                          {produtos.map((m: any) => (
                            <div key={m.id} className="flex justify-between text-sm">
                              <span className="text-zinc-400">{m.product?.name} <span className="text-zinc-600 text-xs">×{m.quantity}</span></span>
                              <span className="text-white font-mono">R$ {(m.quantity * (m.unitPrice ?? m.product?.salePrice ?? 0)).toFixed(2)}</span>
                            </div>
                          ))}
                          {/* Total e cashback */}
                          <div className="flex justify-between text-sm pt-1 border-t border-zinc-700">
                            <span className="text-white font-semibold">Total</span>
                            <span className="text-amber-400 font-bold font-mono">R$ {totalAppt.toFixed(2)}</span>
                          </div>
                          {/* Cashback da transação */}
                          {cliente.loyaltyAccount?.transactions?.find((t: any) =>
                            Math.abs(new Date(t.createdAt).getTime() - new Date(a.scheduledAt).getTime()) < 60000 * 5
                          ) && (() => {
                            const tx = cliente.loyaltyAccount.transactions.find((t: any) =>
                              Math.abs(new Date(t.createdAt).getTime() - new Date(a.scheduledAt).getTime()) < 60000 * 5
                            )
                            return (
                              <div className="flex justify-between text-xs text-green-400">
                                <span>Cashback gerado</span>
                                <span className="font-mono">+ R$ {tx.amount.toFixed(2)}</span>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-white font-bold">Editar Cliente</h2>
              <button onClick={() => setModalEditar(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome completo *</label>
                <input value={nome} onChange={(e) => {
                  const f = e.target.value.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase())
                  setNome(f)
                }} required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Telefone *</label>
                <div className="flex gap-2">
                  <select value={paisIdx} onChange={(e) => { setPaisIdx(Number(e.target.value)); setTelefone("") }}
                    className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                    {paises.map((p, i) => <option key={i} value={i}>{p.sigla} {p.codigo}</option>)}
                  </select>
                  <input value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value, pais.digitos))}
                    required placeholder={pais.mascara.replace(/X/g, "9")}
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Data de nascimento</label>
                <input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div className="pt-1">
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest border-t border-zinc-800 pt-3">Endereço para domicílio</p>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  CEP {buscandoCep && <span className="text-zinc-500 normal-case">— buscando...</span>}
                </label>
                <input value={cep} onChange={(e) => handleCep(e.target.value)} placeholder="00000-000"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-zinc-400 text-xs mb-1 block">Rua</label>
                  <input value={rua} onChange={(e) => setRua(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Número</label>
                  <input value={numero} onChange={(e) => setNumero(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Bairro</label>
                  <input value={bairro} onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Cidade</label>
                  <input value={cidade} onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
              </div>
              {erroEditar && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erroEditar}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalEditar(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {modalExcluir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-white font-bold text-lg mb-2">Excluir cliente?</h2>
            <p className="text-zinc-400 text-sm mb-1">
              O cliente <span className="text-white font-medium">{cliente.name}</span> será desativado.
            </p>
            <p className="text-zinc-600 text-xs mb-6">O histórico de agendamentos será preservado.</p>
            <div className="flex gap-3">
              <button onClick={() => setModalExcluir(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={handleExcluir} disabled={excluindo}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 font-medium px-4 py-2.5 rounded-lg text-sm border border-red-500/20 transition-colors">
                {excluindo ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}