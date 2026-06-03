"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/AdminLayout"

type Plano = {
  id: string
  name: string
  description: string | null
  priceMonthly: number
  maxEstablishments: number | null
  maxUsers: number | null
  maxClients: number | null
  maxAppointments: number | null
  maxStorageMb: number | null
  features: Record<string, boolean> | null
  isActive: boolean
  empresas: number
}

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

const FEATURES_DISPONIVEIS = [
  { key: "financeiro",    label: "Financeiro" },
  { key: "relatorios",   label: "Relatórios" },
  { key: "cashback",     label: "Cashback" },
  { key: "multiUnidade", label: "Multi-unidade" },
  { key: "ia",           label: "IA / Biotipo" },
  { key: "painel_tv",    label: "Painel TV" },
  { key: "nfse",         label: "NFS-e" },
  { key: "api",          label: "API externa" },
]

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function limiteStr(v: number | null) {
  return v === null ? "Ilimitado" : v.toLocaleString("pt-BR")
}

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Plano | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  // Form
  const [fId, setFId] = useState("")
  const [fName, setFName] = useState("")
  const [fDesc, setFDesc] = useState("")
  const [fPreco, setFPreco] = useState("")
  const [fMaxEstab, setFMaxEstab] = useState("")
  const [fMaxUsers, setFMaxUsers] = useState("")
  const [fMaxClients, setFMaxClients] = useState("")
  const [fMaxAppts, setFMaxAppts] = useState("")
  const [fMaxStorage, setFMaxStorage] = useState("")
  const [fFeatures, setFFeatures] = useState<Record<string, boolean>>({})

  useEffect(() => { buscar() }, [])

  async function buscar() {
    setLoading(true)
    const res = await fetch("/api/admin/planos")
    const data = await res.json()
    setPlanos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    setFId(""); setFName(""); setFDesc(""); setFPreco("")
    setFMaxEstab(""); setFMaxUsers(""); setFMaxClients(""); setFMaxAppts(""); setFMaxStorage("")
    setFFeatures({}); setErro(""); setModal(true)
  }

  function abrirEditar(p: Plano) {
    setEditando(p)
    setFId(p.id); setFName(p.name); setFDesc(p.description ?? ""); setFPreco(String(p.priceMonthly))
    setFMaxEstab(p.maxEstablishments !== null ? String(p.maxEstablishments) : "")
    setFMaxUsers(p.maxUsers !== null ? String(p.maxUsers) : "")
    setFMaxClients(p.maxClients !== null ? String(p.maxClients) : "")
    setFMaxAppts(p.maxAppointments !== null ? String(p.maxAppointments) : "")
    setFMaxStorage(p.maxStorageMb !== null ? String(p.maxStorageMb) : "")
    setFFeatures(p.features ?? {}); setErro(""); setModal(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setErro("")
    try {
      const body = {
        id: fId, name: fName, description: fDesc || null,
        priceMonthly: Number(fPreco),
        maxEstablishments: fMaxEstab || null,
        maxUsers: fMaxUsers || null,
        maxClients: fMaxClients || null,
        maxAppointments: fMaxAppts || null,
        maxStorageMb: fMaxStorage || null,
        features: Object.keys(fFeatures).length ? fFeatures : null,
      }
      const url = editando ? `/api/admin/planos/${editando.id}` : "/api/admin/planos"
      const method = editando ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || "Erro ao salvar"); return }
      await buscar()
      setModal(false)
    } catch (err) { setErro(String(err)) }
    finally { setSalvando(false) }
  }

  async function toggleAtivo(p: Plano) {
    await fetch(`/api/admin/planos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    buscar()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Planos</h1>
            <p className="text-zinc-500 text-sm mt-1">Gerencie os planos SaaS e seus limites.</p>
          </div>
          <button onClick={abrirNovo} className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-lg text-sm">
            + Novo plano
          </button>
        </div>

        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {planos.map(p => (
              <div key={p.id} className={`bg-zinc-900 border rounded-2xl p-5 ${p.isActive ? "border-zinc-800" : "border-zinc-800 opacity-60"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-bold text-lg">{p.name}</span>
                      <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{p.id}</span>
                      {!p.isActive && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Inativo</span>}
                      <span className="text-xs text-zinc-500">{p.empresas} empresa{p.empresas !== 1 ? "s" : ""}</span>
                    </div>
                    {p.description && <p className="text-zinc-500 text-sm mb-3">{p.description}</p>}

                    <div className="grid grid-cols-5 gap-3 text-xs">
                      {[
                        { label: "Preço/mês", value: fmtMoeda(p.priceMonthly), color: "text-amber-400 font-bold text-sm" },
                        { label: "Unidades", value: limiteStr(p.maxEstablishments) },
                        { label: "Usuários", value: limiteStr(p.maxUsers) },
                        { label: "Clientes", value: limiteStr(p.maxClients) },
                        { label: "Storage", value: p.maxStorageMb ? `${p.maxStorageMb} MB` : "Ilimitado" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-zinc-800 rounded-lg p-2.5">
                          <div className="text-zinc-500 mb-1">{label}</div>
                          <div className={color ?? "text-white font-semibold"}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {p.features && Object.keys(p.features).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {Object.entries(p.features).filter(([,v]) => v).map(([k]) => (
                          <span key={k} className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                            {FEATURES_DISPONIVEIS.find(f => f.key === k)?.label ?? k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => abrirEditar(p)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs border border-zinc-700 transition-colors">
                      ✏️ Editar
                    </button>
                    <button onClick={() => toggleAtivo(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${p.isActive
                        ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"}`}>
                      {p.isActive ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <h2 className="text-white font-bold">{editando ? `Editar: ${editando.name}` : "Novo Plano"}</h2>
              <button onClick={() => setModal(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={salvar} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">ID do plano *</label>
                  <input value={fId} onChange={e => setFId(e.target.value)} required disabled={!!editando}
                    placeholder="EX: ENTERPRISE" className={`${inputCls} ${editando ? "opacity-50 cursor-not-allowed" : ""}`} />
                  <p className="text-zinc-600 text-[10px] mt-0.5">Será convertido para maiúsculas</p>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Nome *</label>
                  <input value={fName} onChange={e => setFName(e.target.value)} required placeholder="Plano Pro" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Descrição</label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Para barbearias com equipe maior" className={inputCls} />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Preço mensal (R$) *</label>
                <input value={fPreco} onChange={e => setFPreco(e.target.value)} required type="number" min="0" step="0.01" placeholder="99" className={inputCls} />
              </div>

              <div className="space-y-2">
                <div className="text-zinc-400 text-xs uppercase tracking-wider">Limites <span className="text-zinc-600 normal-case">(vazio = ilimitado)</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-500 text-xs mb-0.5 block">Unidades</label>
                    <input value={fMaxEstab} onChange={e => setFMaxEstab(e.target.value)} type="number" min="1" placeholder="Ilimitado" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs mb-0.5 block">Usuários</label>
                    <input value={fMaxUsers} onChange={e => setFMaxUsers(e.target.value)} type="number" min="1" placeholder="Ilimitado" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs mb-0.5 block">Clientes</label>
                    <input value={fMaxClients} onChange={e => setFMaxClients(e.target.value)} type="number" min="1" placeholder="Ilimitado" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs mb-0.5 block">Agendamentos/mês</label>
                    <input value={fMaxAppts} onChange={e => setFMaxAppts(e.target.value)} type="number" min="1" placeholder="Ilimitado" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-zinc-500 text-xs mb-0.5 block">Storage (MB)</label>
                    <input value={fMaxStorage} onChange={e => setFMaxStorage(e.target.value)} type="number" min="1" placeholder="Ilimitado" className={inputCls} />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Funcionalidades incluídas</div>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES_DISPONIVEIS.map(f => (
                    <label key={f.key} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${fFeatures[f.key] ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                      <input type="checkbox" checked={!!fFeatures[f.key]}
                        onChange={e => setFFeatures(prev => ({ ...prev, [f.key]: e.target.checked }))}
                        className="accent-amber-500" />
                      <span className="text-sm">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {erro && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">{erro}</div>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar plano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
