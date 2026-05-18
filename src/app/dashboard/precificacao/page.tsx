"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

type Regra = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  markupPct: number
  discountPct: number
  daysOfWeek: number[]
  startTime: string | null
  endTime: string | null
}

type Servico = {
  id: string
  name: string
  price: number
  durationMin: number
  isActive: boolean
  category: string | null
}

const regraVazia: Omit<Regra, "id"> = {
  name: "",
  description: "",
  isActive: true,
  markupPct: 0,
  discountPct: 0,
  daysOfWeek: [],
  startTime: "",
  endTime: "",
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtHorario(start: string | null, end: string | null) {
  if (!start || !end) return "Dia todo"
  return `${start} – ${end}`
}

function descricaoDias(dias: number[]) {
  if (dias.length === 7) return "Todos os dias"
  return dias.slice().sort().map(d => DIAS[d]).join(", ")
}

export default function PrecificacaoPage() {
  const [regras, setRegras] = useState<Regra[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const [modal, setModal] = useState<{ aberto: boolean; editando: Regra | null }>({ aberto: false, editando: null })
  const [form, setForm] = useState(regraVazia)
  const [salvando, setSalvando] = useState(false)
  const [erroMsg, setErroMsg] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/precificacao").then(r => r.json()),
      fetch("/api/servicos").then(r => r.json()),
    ]).then(([r, s]) => {
      if (Array.isArray(r)) setRegras(r)
      if (Array.isArray(s)) setServicos(s.filter((sv: Servico) => sv.isActive))
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  function toggleExpandido(id: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function abrirNova() {
    setForm(regraVazia); setErroMsg("")
    setModal({ aberto: true, editando: null })
  }

  function abrirEdicao(regra: Regra) {
    setForm({
      name: regra.name,
      description: regra.description || "",
      isActive: regra.isActive,
      markupPct: regra.markupPct,
      discountPct: regra.discountPct,
      daysOfWeek: [...regra.daysOfWeek],
      startTime: regra.startTime || "",
      endTime: regra.endTime || "",
    })
    setErroMsg("")
    setModal({ aberto: true, editando: regra })
  }

  async function handleToggle(regra: Regra) {
    setRegras(prev => prev.map(r => r.id === regra.id ? { ...r, isActive: !r.isActive } : r))
    await fetch(`/api/precificacao/${regra.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !regra.isActive }),
    })
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir esta regra?")) return
    setRegras(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/precificacao/${id}`, { method: "DELETE" })
  }

  function toggleDia(dia: number) {
    setForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(dia)
        ? prev.daysOfWeek.filter(d => d !== dia)
        : [...prev.daysOfWeek, dia].sort(),
    }))
  }

  async function handleSalvar() {
    if (!form.name.trim()) { setErroMsg("Nome obrigatório"); return }
    if (form.daysOfWeek.length === 0) { setErroMsg("Selecione ao menos um dia"); return }
    setSalvando(true); setErroMsg("")
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        isActive: form.isActive,
        markupPct: parseFloat(String(form.markupPct)) || 0,
        discountPct: parseFloat(String(form.discountPct)) || 0,
        daysOfWeek: form.daysOfWeek,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
      }
      if (modal.editando) {
        const res = await fetch(`/api/precificacao/${modal.editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setErroMsg(data.error || "Erro ao salvar"); return }
        setRegras(prev => prev.map(r => r.id === modal.editando!.id ? data : r))
      } else {
        const res = await fetch("/api/precificacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setErroMsg(data.error || "Erro ao criar"); return }
        setRegras(prev => [...prev, data])
      }
      setModal({ aberto: false, editando: null })
    } catch (err) { setErroMsg(String(err)) }
    finally { setSalvando(false) }
  }

  const ativas = regras.filter(r => r.isActive).length

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h1 className="text-white text-xl font-bold">Precificação Dinâmica</h1>
        <p className="text-zinc-500 text-sm">Regras de acréscimo e desconto aplicadas nos cortes ao agendar</p>
      </div>

      <div className="flex gap-4 items-start">

        {/* Coluna esquerda — preços dos serviços */}
        <div className="flex-1 min-w-0">
          <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Preços dos cortes</div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse" />)}
            </div>
          ) : servicos.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-600 text-sm">
              Nenhum serviço ativo cadastrado
            </div>
          ) : (
            <div className="space-y-2">
              {servicos.map(s => (
                <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm font-medium">{s.name}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">{s.durationMin}min{s.category ? ` · ${s.category}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold font-mono">{fmtMoeda(s.price)}</div>
                  </div>
                </div>
              ))}
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 mt-3">
                <div className="text-zinc-600 text-xs text-center">
                  Integração com IA para sugestão de preços — em breve
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita — regras de precificação */}
        <div className="w-[48%] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Regras</span>
              {ativas > 0 && (
                <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded-full">
                  {ativas} ativa{ativas !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              onClick={abrirNova}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              + Nova regra
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-12 bg-zinc-900 rounded-xl animate-pulse" />)}
            </div>
          ) : regras.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <div className="text-zinc-600 text-sm mb-2">Nenhuma regra configurada</div>
              <button onClick={abrirNova} className="text-amber-500 text-xs hover:text-amber-400 transition-colors">
                + Criar primeira regra
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {regras.map(regra => {
                const expandido = expandidos.has(regra.id)
                return (
                  <div key={regra.id} className={`bg-zinc-900 border rounded-xl transition-all ${regra.isActive ? "border-zinc-700" : "border-zinc-800 opacity-60"}`}>
                    {/* Cabeçalho sempre visível */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      {/* Toggle ativo */}
                      <button
                        type="button"
                        onClick={() => handleToggle(regra)}
                        className={`w-8 h-5 rounded-full flex-shrink-0 relative transition-colors ${regra.isActive ? "bg-amber-500" : "bg-zinc-700"}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${regra.isActive ? "left-4" : "left-0.5"}`} />
                      </button>

                      {/* Nome — clica para expandir */}
                      <button
                        type="button"
                        onClick={() => toggleExpandido(regra.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-xs font-medium truncate">{regra.name}</span>
                          {regra.markupPct > 0 && (
                            <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-1 py-0.5 rounded flex-shrink-0">+{regra.markupPct}%</span>
                          )}
                          {regra.discountPct > 0 && (
                            <span className="text-xs font-mono font-bold text-green-400 bg-green-500/10 px-1 py-0.5 rounded flex-shrink-0">-{regra.discountPct}%</span>
                          )}
                        </div>
                        {!expandido && regra.description && (
                          <div className="text-zinc-600 text-xs truncate mt-0.5">{regra.description}</div>
                        )}
                      </button>

                      {/* Chevron */}
                      <span
                        onClick={() => toggleExpandido(regra.id)}
                        className="text-zinc-600 text-xs cursor-pointer hover:text-zinc-400 transition-all flex-shrink-0"
                        style={{ display: "inline-block", transform: expandido ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
                      >
                        ›
                      </span>

                      {/* Ações */}
                      <button
                        onClick={() => abrirEdicao(regra)}
                        className="text-zinc-600 hover:text-zinc-200 text-xs px-1.5 py-1 rounded hover:bg-zinc-800 transition-colors flex-shrink-0"
                      >
                        ✏
                      </button>
                      <button
                        onClick={() => handleExcluir(regra.id)}
                        className="text-zinc-700 hover:text-red-400 text-xs px-1.5 py-1 rounded hover:bg-zinc-800 transition-colors flex-shrink-0"
                      >
                        🗑
                      </button>
                    </div>

                    {/* Tabela — só quando expandido */}
                    {expandido && (
                      <div className="border-t border-zinc-800 px-3 pb-3 pt-2">
                        {regra.description && (
                          <div className="text-zinc-500 text-xs mb-2">{regra.description}</div>
                        )}
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left border-b border-zinc-800">
                              <th className="text-zinc-500 font-normal pb-1.5 pr-4">Dia</th>
                              <th className="text-zinc-500 font-normal pb-1.5 pr-4">Horário</th>
                              <th className="text-zinc-500 font-normal pb-1.5 pr-3 text-center">Desconto</th>
                              <th className="text-zinc-500 font-normal pb-1.5 text-center">Acréscimo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {regra.daysOfWeek.slice().sort().map(dia => (
                              <tr key={dia} className="border-b border-zinc-800/30">
                                <td className="py-1.5 pr-4 text-white font-medium">{DIAS[dia]}</td>
                                <td className="py-1.5 pr-4 text-zinc-400 font-mono">{fmtHorario(regra.startTime, regra.endTime)}</td>
                                <td className="py-1.5 pr-3 text-center">
                                  {regra.discountPct > 0
                                    ? <span className="text-green-400 font-bold">-{regra.discountPct}%</span>
                                    : <span className="text-zinc-700">—</span>}
                                </td>
                                <td className="py-1.5 text-center">
                                  {regra.markupPct > 0
                                    ? <span className="text-red-400 font-bold">+{regra.markupPct}%</span>
                                    : <span className="text-zinc-700">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="text-zinc-600 text-xs mt-1.5">{descricaoDias(regra.daysOfWeek)}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal criar/editar */}
      {modal.aberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">{modal.editando ? "Editar regra" : "Nova regra"}</h2>
              <button onClick={() => setModal({ aberto: false, editando: null })} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome da regra *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Horário de pico"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Descrição</label>
                <input
                  value={form.description || ""}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Sex e Sáb entre 14h-18h"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Dias da semana *</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DIAS.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDia(idx)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.daysOfWeek.includes(idx) ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Horário <span className="text-zinc-600">(vazio = dia todo)</span></label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={form.startTime || ""}
                    onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 [color-scheme:dark]"
                  />
                  <span className="text-zinc-500 text-xs">até</span>
                  <input
                    type="time"
                    value={form.endTime || ""}
                    onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Acréscimo %</label>
                  <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500">
                    <span className="text-zinc-500 text-xs px-2">+</span>
                    <input
                      type="number" min="0" max="200" step="1"
                      value={form.markupPct}
                      onChange={e => setForm(p => ({ ...p, markupPct: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className="flex-1 bg-transparent text-white text-sm px-1 py-2 outline-none"
                    />
                    <span className="text-zinc-500 text-xs px-2">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Desconto %</label>
                  <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500">
                    <span className="text-zinc-500 text-xs px-2">-</span>
                    <input
                      type="number" min="0" max="100" step="1"
                      value={form.discountPct}
                      onChange={e => setForm(p => ({ ...p, discountPct: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className="flex-1 bg-transparent text-white text-sm px-1 py-2 outline-none"
                    />
                    <span className="text-zinc-500 text-xs px-2">%</span>
                  </div>
                </div>
              </div>
              {erroMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erroMsg}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModal({ aberto: false, editando: null })}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
