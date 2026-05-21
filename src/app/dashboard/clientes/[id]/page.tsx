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
      <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
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
            {cliente.phone && <span>📱 {cliente.phone}</span>}
            {cliente.email && <span>✉️ {cliente.email}</span>}
            {idade && <span>🎂 {idade} anos</span>}
            {cliente.homeCity && <span>📍 {cliente.homeCity}</span>}
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
                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-1.5 rounded-lg text-sm border border-green-500/20 transition-colors"
              >
                💬 WhatsApp
              </a>
            )}
            <button
              onClick={abrirEditar}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-1.5 rounded-lg text-sm border border-zinc-700 transition-colors"
            >
              ✏️ Editar
            </button>
            <button
              onClick={() => setModalExcluir(true)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-1.5 rounded-lg text-sm border border-red-500/20 transition-colors"
            >
              🗑 Excluir
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
          { id: "perfil", label: "👤 Perfil" },
          { id: "historico", label: "📋 Histórico" },
          { id: "financeiro", label: "💰 Financeiro" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}>
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