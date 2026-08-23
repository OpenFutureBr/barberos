"use client"

import { useState, useEffect, useRef } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import PagamentoModal from "@/components/layout/PagamentoModal"
import type { DadosPagamento } from "@/components/layout/PagamentoModal"
import CardCarousel from "@/components/ui/CardCarousel"

type Plano = {
  id: string; name: string; description: string | null
  price: number; cortesIncluidos: number; atendedomicilio: boolean
  services: string[]; isActive: boolean
  subscriptions: { id: string }[]
}

type Assinante = {
  id: string; status: string; price: number
  startedAt: string; nextBillingAt: string
  client: { id: string; name: string; phone: string }
  plan: { id: string; name: string; price: number; cortesIncluidos: number; atendedomicilio: boolean }
}

type ClienteSimples = { id: string; name: string; phone: string }

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-400 border border-green-500/20",
  PAUSED: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border border-red-500/20",
  OVERDUE: "bg-red-500/10 text-red-400 border border-red-500/20",
}
const statusLabel: Record<string, string> = {
  ACTIVE: "Ativo", PAUSED: "Pausado", CANCELLED: "Cancelado", OVERDUE: "Em atraso",
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR")
}

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

export default function AssinaturasPage() {
  const [aba, setAba] = useState<"planos" | "assinantes">("planos")
  const [planos, setPlanos] = useState<Plano[]>([])
  const [assinantes, setAssinantes] = useState<Assinante[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [expandidoPlano, setExpandidoPlano] = useState<string | null>(null)
  const [dadosRenovacao, setDadosRenovacao] = useState<(DadosPagamento & { assinanteId: string }) | null>(null)

  // Painel lateral adicionar assinante
  const [painelAberto, setPainelAberto] = useState(false)
  const [clientes, setClientes] = useState<ClienteSimples[]>([])
  const [buscaCliente, setBuscaCliente] = useState("")
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSimples | null>(null)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [planoSelecionado, setPlanoSelecionado] = useState("")
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split("T")[0])
  const [erroAssinante, setErroAssinante] = useState("")
  const dropRef = useRef<HTMLDivElement>(null)

  // Modal novo plano
  const [modalPlano, setModalPlano] = useState(false)
  const [editandoPlano, setEditandoPlano] = useState<Plano | null>(null)
  const [nomePlano, setNomePlano] = useState("")
  const [descPlano, setDescPlano] = useState("")
  const [precoPlano, setPrecoPlano] = useState("")
  const [cortesPlano, setCortesPlano] = useState("4")
  const [domicilioPlano, setDomicilioPlano] = useState(false)
  const [servPlano, setServPlano] = useState<string[]>([])
  const [erroPlano, setErroPlano] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/assinaturas/planos").then(r => r.json()),
      fetch("/api/assinaturas/assinantes").then(r => r.json()),
      fetch("/api/servicos").then(r => r.json()),
    ]).then(([p, a, svcs]) => {
      if (Array.isArray(p)) setPlanos(p)
      if (Array.isArray(a)) setAssinantes(a)
      // Lista fixa de categorias (mesma do cadastro de serviços)
      const fixas = ["Corte", "Barba", "Combo", "Química", "Tratamento", "Premium"]
      if (Array.isArray(svcs)) {
        const doDb = svcs.map((s: any) => s.category).filter(Boolean) as string[]
        const todas = [...new Set([...fixas, ...doDb])]
        setCategorias(todas)
      } else {
        setCategorias(fixas)
      }
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!painelAberto) return
    fetch("/api/clientes?modo=simples").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setClientes(d)
    })
  }, [painelAberto])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownAberto(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const clientesFiltrados = buscaCliente
    ? clientes.filter(c => c.name.toLowerCase().includes(buscaCliente.toLowerCase()) || c.phone.includes(buscaCliente))
    : clientes.slice(0, 6)

  const planosAtivos = planos.filter(p => p.isActive)
  const totalAssinantes = assinantes.length
  const totalReceita = assinantes.filter(a => a.status === "ACTIVE").reduce((s, a) => s + a.price, 0)
  const atrasados = assinantes.filter(a => a.status === "OVERDUE").length

  function abrirModalPlano(plano?: Plano) {
    if (plano) {
      setEditandoPlano(plano)
      setNomePlano(plano.name)
      setDescPlano(plano.description ?? "")
      setPrecoPlano(String(plano.price))
      setCortesPlano(String(plano.cortesIncluidos))
      setDomicilioPlano(plano.atendedomicilio)
      setServPlano(plano.services)
    } else {
      setEditandoPlano(null)
      setNomePlano(""); setDescPlano(""); setPrecoPlano(""); setCortesPlano("4")
      setDomicilioPlano(false); setServPlano([])
    }
    setErroPlano("")
    setModalPlano(true)
  }

  async function handleSalvarPlano(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!nomePlano.trim()) { setErroPlano("Nome obrigatório"); return }
    if (!precoPlano || isNaN(parseFloat(precoPlano))) { setErroPlano("Preço inválido"); return }
    setSalvando(true); setErroPlano("")
    try {
      const payload = { name: nomePlano, description: descPlano || null, price: parseFloat(precoPlano), cortesIncluidos: parseInt(cortesPlano) || 4, atendedomicilio: domicilioPlano, services: servPlano }
      let res: Response
      if (editandoPlano) {
        res = await fetch(`/api/assinaturas/planos/${editandoPlano.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      } else {
        res = await fetch("/api/assinaturas/planos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      }
      const data = await res.json()
      if (!res.ok) { setErroPlano(data.error || "Erro ao salvar"); return }
      if (editandoPlano) {
        setPlanos(prev => prev.map(p => p.id === editandoPlano.id ? { ...p, ...data } : p))
      } else {
        setPlanos(prev => [...prev, { ...data, subscriptions: [] }])
      }
      setModalPlano(false)
    } catch (err) { setErroPlano(String(err)) }
    finally { setSalvando(false) }
  }

  async function handleTogglePlano(plano: Plano) {
    setPlanos(prev => prev.map(p => p.id === plano.id ? { ...p, isActive: !p.isActive } : p))
    await fetch(`/api/assinaturas/planos/${plano.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plano.isActive }),
    })
  }

  function abrirRenovacao(a: Assinante) {
    setDadosRenovacao({
      assinanteId: a.id,
      appointmentId: a.id, // usado como identificador interno no PagamentoModal
      clientName: a.client.name,
      serviceName: `Renovação — ${a.plan.name}`,
      amount: a.price,
    })
  }

  async function handleAdicionarAssinante(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!clienteSelecionado) { setErroAssinante("Selecione um cliente"); return }
    if (!planoSelecionado) { setErroAssinante("Selecione um plano"); return }
    setSalvando(true); setErroAssinante("")
    try {
      const res = await fetch("/api/assinaturas/assinantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clienteSelecionado.id, planId: planoSelecionado, startedAt: dataInicio }),
      })
      const data = await res.json()
      if (!res.ok) { setErroAssinante(data.error || "Erro ao adicionar"); return }
      setAssinantes(prev => [data, ...prev])
      setPainelAberto(false)
      setBuscaCliente(""); setClienteSelecionado(null); setPlanoSelecionado(""); setDataInicio(new Date().toISOString().split("T")[0])
      setAba("assinantes")
    } catch (err) { setErroAssinante(String(err)) }
    finally { setSalvando(false) }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Assinaturas</h1>
          <p className="text-zinc-500 text-sm">Planos mensais com cotas de cortes</p>
        </div>
        <div className="flex items-center gap-2">
          {aba === "planos" && (
            <button onClick={() => abrirModalPlano()}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              + Novo plano
            </button>
          )}
          {aba === "assinantes" && (
            <button onClick={() => setPainelAberto(p => !p)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              + Adicionar assinante
            </button>
          )}
        </div>
      </div>

      {/* KPIs — carrossel no mobile, grid no desktop (mesmo padrão do Dashboard) */}
      {(() => {
        const kpis = [
          { label: "Planos ativos", val: planosAtivos.length, cor: "text-amber-400" },
          { label: "Assinantes", val: totalAssinantes, cor: "text-white" },
          { label: "Receita mensal", val: fmtMoeda(totalReceita), cor: "text-green-400" },
          { label: "Em atraso", val: atrasados, cor: atrasados > 0 ? "text-red-400" : "text-zinc-600" },
        ].map(k => (
          <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 h-full">
            <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{k.label}</div>
            {loading ? <div className="h-7 bg-zinc-800 rounded animate-pulse" /> : <div className={`text-xl font-bold ${k.cor}`}>{k.val}</div>}
          </div>
        ))
        return (
          <div className="mb-4">
            <CardCarousel cards={kpis} />
            <div className="hidden md:grid md:grid-cols-4 gap-3">{kpis}</div>
          </div>
        )
      })()}

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {([{ id: "planos", label: "Planos" }, { id: "assinantes", label: "Assinantes" }] as const).map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${aba === t.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PLANOS */}
      {aba === "planos" && (
        loading ? <div className="text-center py-12 text-zinc-600">Carregando...</div> :
        planos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-zinc-600 text-sm mb-3">Nenhum plano criado ainda</div>
            <button onClick={() => abrirModalPlano()} className="text-amber-500 text-sm hover:text-amber-400 transition-colors">+ Criar primeiro plano</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {planos.map(p => (
              <div key={p.id} className={`bg-zinc-900 border rounded-xl p-4 transition-all ${p.isActive ? "border-zinc-700" : "border-zinc-800 opacity-60"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-bold">{p.name}</div>
                    {p.description && <div className="text-zinc-500 text-xs mt-0.5">{p.description}</div>}
                  </div>
                  <button onClick={() => handleTogglePlano(p)}
                    className={`w-8 h-5 rounded-full relative flex-shrink-0 transition-colors ${p.isActive ? "bg-amber-500" : "bg-zinc-700"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${p.isActive ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>

                <div className="text-amber-400 text-2xl font-bold mb-3">{fmtMoeda(p.price)}<span className="text-zinc-500 text-sm font-normal">/mês</span></div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">✂</span>
                    <span className="text-zinc-300">{p.cortesIncluidos} corte{p.cortesIncluidos !== 1 ? "s" : ""}/mês</span>
                  </div>
                  {p.atendedomicilio && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-400">🚗</span>
                      <span className="text-zinc-300">Atende a domicílio</span>
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandidoPlano(expandidoPlano === p.id ? null : p.id)}
                      className="flex items-center justify-between w-full text-left group"
                    >
                      <span className="text-zinc-500 text-xs">
                        {p.services.length === 0
                          ? "Cobre todos os serviços"
                          : p.services.slice(0, 2).join(", ") + (p.services.length > 2 ? ` +${p.services.length - 2}` : "")}
                      </span>
                      <span className={`text-zinc-600 text-xs transition-transform group-hover:text-zinc-400 ${expandidoPlano === p.id ? "rotate-90" : ""}`}
                        style={{ display: "inline-block", transition: "transform 0.15s" }}>›</span>
                    </button>
                    {expandidoPlano === p.id && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.services.length === 0
                          ? categorias.map(c => <span key={c} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">{c}</span>)
                          : p.services.map(s => <span key={s} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">{s}</span>)
                        }
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-2 space-y-1.5">
                  <button
                    onClick={() => { setAba("assinantes"); setPainelAberto(true); setPlanoSelecionado(p.id) }}
                    className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium py-1.5 rounded-lg border border-amber-500/20 transition-colors"
                  >
                    + Adicionar assinante
                  </button>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{p.subscriptions.length} assinante{p.subscriptions.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => abrirModalPlano(p)} className="text-zinc-500 hover:text-zinc-200 transition-colors">✏ Editar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ASSINANTES */}
      {aba === "assinantes" && (
        <div className="flex gap-4">
          {/* Lista */}
          <div className="flex-1">
            {loading ? <div className="text-center py-12 text-zinc-600">Carregando...</div> :
            assinantes.length === 0 ? (
              <div className="text-center py-16 text-zinc-600 text-sm">Nenhum assinante ainda</div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Plano</th>
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Renovação</th>
                      <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
                      <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {assinantes.map((a, i) => (
                      <tr key={a.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors ${i === assinantes.length - 1 ? "border-0" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="text-white text-sm font-medium">{a.client.name}</div>
                          <div className="text-zinc-500 text-xs">{a.client.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-300 text-sm">{a.plan.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-zinc-600 text-xs">{(a as any).cortesUsados ?? 0}/{a.plan.cortesIncluidos} usados</div>
                            <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden" style={{ maxWidth: 48 }}>
                              <div className={`h-full rounded-full transition-all ${(a as any).cortesUsados >= a.plan.cortesIncluidos ? "bg-red-500" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(100, ((a as any).cortesUsados ?? 0) / a.plan.cortesIncluidos * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-sm font-mono">{fmtData(a.nextBillingAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[a.status] ?? statusStyle.ACTIVE}`}>
                            {statusLabel[a.status] ?? a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">{fmtMoeda(a.price)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => abrirRenovacao(a)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-colors whitespace-nowrap"
                          >
                            Renovar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Painel lateral — adicionar assinante */}
          {painelAberto && (
            <div className="w-80 flex-shrink-0">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-sm">Novo assinante</h3>
                  <button onClick={() => setPainelAberto(false)} className="text-zinc-500 hover:text-white text-lg transition-colors">✕</button>
                </div>
                <form onSubmit={handleAdicionarAssinante} className="space-y-3">
                  {/* Busca cliente */}
                  <div>
                    <label className="text-zinc-400 text-xs mb-1.5 block">Cliente *</label>
                    <div ref={dropRef} className="relative">
                      <input
                        value={clienteSelecionado ? clienteSelecionado.name : buscaCliente}
                        onChange={e => { setBuscaCliente(e.target.value); setClienteSelecionado(null); setDropdownAberto(true) }}
                        onFocus={() => setDropdownAberto(true)}
                        placeholder="Buscar cliente..."
                        className={inputCls}
                      />
                      {clienteSelecionado && (
                        <button type="button" onClick={() => { setClienteSelecionado(null); setBuscaCliente("") }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-sm">✕</button>
                      )}
                      {dropdownAberto && !clienteSelecionado && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                          {clientesFiltrados.length === 0
                            ? <div className="px-3 py-2.5 text-zinc-600 text-sm">Nenhum cliente encontrado</div>
                            : clientesFiltrados.map(c => (
                              <button key={c.id} type="button"
                                onMouseDown={() => { setClienteSelecionado(c); setBuscaCliente(""); setDropdownAberto(false) }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-700 transition-colors text-left">
                                <div className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{c.name.charAt(0)}</div>
                                <div>
                                  <div className="text-white text-sm">{c.name}</div>
                                  <div className="text-zinc-500 text-xs">{c.phone}</div>
                                </div>
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plano */}
                  <div>
                    <label className="text-zinc-400 text-xs mb-1.5 block">Plano *</label>
                    <select value={planoSelecionado} onChange={e => setPlanoSelecionado(e.target.value)}
                      className={inputCls}>
                      <option value="">Selecionar plano...</option>
                      {planosAtivos.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {fmtMoeda(p.price)}/mês · {p.cortesIncluidos} cortes</option>
                      ))}
                    </select>
                  </div>

                  {/* Data início */}
                  <div>
                    <label className="text-zinc-400 text-xs mb-1.5 block">Data de início</label>
                    <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                      className={`${inputCls} [color-scheme:dark]`} />
                  </div>

                  {erroAssinante && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erroAssinante}</div>
                  )}

                  <button type="submit" disabled={salvando}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors">
                    {salvando ? "Salvando..." : "Adicionar assinante"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal criar/editar plano */}
      {modalPlano && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">{editandoPlano ? "Editar plano" : "Novo plano"}</h2>
              <button onClick={() => setModalPlano(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleSalvarPlano} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome do plano *</label>
                <input value={nomePlano} onChange={e => setNomePlano(e.target.value)} required placeholder="Ex: Plano Full"
                  className={inputCls} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Descrição</label>
                <input value={descPlano} onChange={e => setDescPlano(e.target.value)} placeholder="Opcional"
                  className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço mensal (R$) *</label>
                  <input value={precoPlano} onChange={e => setPrecoPlano(e.target.value)} required inputMode="decimal" placeholder="0,00"
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Cortes incluídos/mês</label>
                  <input type="number" min="1" max="99" value={cortesPlano} onChange={e => setCortesPlano(e.target.value)}
                    className={inputCls} />
                </div>
              </div>
              {/* Categorias cobertas */}
              {categorias.length > 0 && (
                <div>
                  <label className="text-zinc-400 text-xs mb-2 block">Categorias de serviço cobertas pelo plano</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {categorias.map(cat => (
                      <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                        <div
                          onClick={() => setServPlano(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                            servPlano.includes(cat) ? "bg-amber-500 border-amber-500" : "border-zinc-600 bg-zinc-800 group-hover:border-zinc-500"
                          }`}
                        >
                          {servPlano.includes(cat) && <span className="text-black text-xs font-bold">✓</span>}
                        </div>
                        <span className="text-zinc-300 text-sm">{cat}</span>
                      </label>
                    ))}
                  </div>
                  {servPlano.length === 0 && (
                    <p className="text-zinc-600 text-xs mt-1.5">Sem categoria selecionada = todos os serviços cobertos</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 py-1">
                <button type="button" onClick={() => setDomicilioPlano(p => !p)}
                  className={`w-10 h-6 rounded-full relative transition-colors ${domicilioPlano ? "bg-amber-500" : "bg-zinc-700"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${domicilioPlano ? "left-5" : "left-1"}`} />
                </button>
                <span className="text-zinc-300 text-sm">Atende a domicílio</span>
              </div>
              {erroPlano && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erroPlano}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalPlano(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvando ? "Salvando..." : "Salvar plano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <PagamentoModal
        dados={dadosRenovacao}
        onFechar={() => setDadosRenovacao(null)}
        endpointOverride={dadosRenovacao ? `/api/assinaturas/assinantes/${dadosRenovacao.assinanteId}/renovar` : undefined}
        onConfirmado={() => {
          if (!dadosRenovacao) return
          // Atualiza o assinante localmente após renovação
          fetch(`/api/assinaturas/assinantes`).then(r => r.json()).then(d => {
            if (Array.isArray(d)) setAssinantes(d)
          })
          setDadosRenovacao(null)
        }}
      />
    </DashboardLayout>
  )
}
