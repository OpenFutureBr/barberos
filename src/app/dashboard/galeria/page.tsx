"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/DashboardLayout"

// ── Types ────────────────────────────────────────────────────────────────────

type GaleriaCorte = {
  id: string
  name: string
  description: string | null
  photoUrl: string | null
  instagramUrl: string | null
  category: string | null
  tags: string[]
  difficulty: string | null
  durationMin: number | null
  instructions: string | null
  sortOrder: number
  isActive: boolean
}

type OrgCorteData = {
  id: string
  isEnabled: boolean
  customName: string | null
  customPhotoUrl: string | null
  barbeiros: { id: string; userId: string; establishmentId: string; user: { id: string; name: string; image: string | null } }[]
}

type CorteComOrg = GaleriaCorte & { orgCorte: OrgCorteData | null }

type Barbeiro = { id: string; name: string; image: string | null }

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIAS = ["Corte", "Barba", "Combo", "Química", "Tratamento", "Premium"]
const DIFICULDADES = ["Iniciante", "Intermediário", "Avançado", "Expert"]
const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

// ── Admin view ───────────────────────────────────────────────────────────────

function AdminGaleria() {
  const [cortes, setCortes] = useState<GaleriaCorte[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [modal, setModal] = useState<{ aberto: boolean; editando: GaleriaCorte | null }>({ aberto: false, editando: null })
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null)

  // Form fields
  const [nome, setNome] = useState("")
  const [desc, setDesc] = useState("")
  const [categoria, setCategoria] = useState("")
  const [dificuldade, setDificuldade] = useState("")
  const [duracao, setDuracao] = useState("")
  const [instrucoes, setInstrucoes] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [tags, setTags] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
  const [ativo, setAtivo] = useState(true)

  useEffect(() => {
    fetch("/api/galeria-global")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCortes(d) })
      .finally(() => setLoading(false))
  }, [])

  function abrirNovo() {
    setModal({ aberto: true, editando: null })
    setNome(""); setDesc(""); setCategoria(""); setDificuldade(""); setDuracao("")
    setInstrucoes(""); setInstagramUrl(""); setTags(""); setSortOrder("0"); setAtivo(true)
    setFotoFile(null); setFotoPreview(null); setErro("")
  }

  function abrirEditar(c: GaleriaCorte) {
    setModal({ aberto: true, editando: c })
    setNome(c.name); setDesc(c.description ?? ""); setCategoria(c.category ?? "")
    setDificuldade(c.difficulty ?? ""); setDuracao(c.durationMin ? String(c.durationMin) : "")
    setInstrucoes(c.instructions ?? ""); setInstagramUrl(c.instagramUrl ?? "")
    setTags(c.tags.join(", ")); setSortOrder(String(c.sortOrder)); setAtivo(c.isActive)
    setFotoFile(null); setFotoPreview(c.photoUrl); setErro("")
  }

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!nome.trim()) { setErro("Nome obrigatório"); return }
    setSalvando(true); setErro("")
    try {
      const payload = {
        name: nome.trim(), description: desc || null, category: categoria || null,
        instagramUrl: instagramUrl || null, difficulty: dificuldade || null,
        durationMin: duracao || null, instructions: instrucoes || null,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        sortOrder, isActive: ativo,
      }
      let res: Response
      if (modal.editando) {
        res = await fetch(`/api/galeria-global/${modal.editando.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      } else {
        res = await fetch("/api/galeria-global", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      }
      const salvo = await res.json()
      if (!res.ok) { setErro(salvo.error || "Erro ao salvar"); return }

      if (fotoFile && salvo.id) {
        setUploadando(true)
        const fd = new FormData(); fd.append("foto", fotoFile)
        const upRes = await fetch(`/api/galeria-global/${salvo.id}/foto`, { method: "POST", body: fd })
        const upData = await upRes.json()
        if (upRes.ok) salvo.photoUrl = upData.url
        setUploadando(false)
      }

      if (modal.editando) setCortes(prev => prev.map(c => c.id === modal.editando!.id ? salvo : c))
      else setCortes(prev => [salvo, ...prev])
      setModal({ aberto: false, editando: null })
    } finally {
      setSalvando(false); setUploadando(false)
    }
  }

  async function handleDesativar(id: string) {
    if (!confirm("Desativar este corte da galeria global?")) return
    await fetch(`/api/galeria-global/${id}`, { method: "DELETE" })
    setCortes(prev => prev.map(c => c.id === id ? { ...c, isActive: false } : c))
  }

  async function handleReativar(id: string) {
    await fetch(`/api/galeria-global/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: true }) })
    setCortes(prev => prev.map(c => c.id === id ? { ...c, isActive: true } : c))
  }

  const ativos = cortes.filter(c => c.isActive && (!filtro || c.name.toLowerCase().includes(filtro.toLowerCase()) || (c.category ?? "").toLowerCase().includes(filtro.toLowerCase())))
  const inativos = cortes.filter(c => !c.isActive)
  const groups = [...new Set(ativos.map(c => c.category || "Geral"))]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Galeria de Cortes</h1>
          <p className="text-zinc-500 text-sm">{ativos.length} estilo{ativos.length !== 1 ? "s" : ""} ativos na plataforma · visível para todas as organizações</p>
        </div>
        <button onClick={abrirNovo} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm">
          + Novo estilo
        </button>
      </div>

      <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar por nome ou categoria..."
        className={`${inputCls} mb-4`} />

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Carregando...</div>
      ) : ativos.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm">Nenhum estilo na galeria global. <button onClick={abrirNovo} className="text-amber-400 hover:text-amber-300">Criar primeiro →</button></div>
      ) : (
        <div className="space-y-6">
          {groups.map(cat => (
            <div key={cat}>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2.5">{cat}</p>
              <div className="grid grid-cols-4 gap-3">
                {ativos.filter(c => (c.category || "Geral") === cat).map(c => (
                  <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors group">
                    <div className="h-32 bg-zinc-800 relative overflow-hidden cursor-zoom-in"
                      onClick={() => c.photoUrl && setFotoExpandida(c.photoUrl)}>
                      {c.photoUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sem foto</div>}
                      {c.difficulty && <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-black/70 text-zinc-300 rounded">{c.difficulty}</span>}
                    </div>
                    <div className="p-2.5">
                      <div className="text-white text-sm font-medium truncate">{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {c.durationMin && <span className="text-zinc-600 text-xs">{c.durationMin} min</span>}
                        {c.tags.length > 0 && <span className="text-zinc-700 text-xs">· {c.tags.slice(0, 2).join(", ")}</span>}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => abrirEditar(c)}
                          className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded-lg transition-colors">Editar</button>
                        <button onClick={() => handleDesativar(c.id)}
                          className="text-xs bg-zinc-800 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 px-2 py-1 rounded-lg transition-colors">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {inativos.length > 0 && (
        <div className="mt-6">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Inativos</p>
          <div className="flex gap-2 flex-wrap">
            {inativos.map(c => (
              <button key={c.id} onClick={() => handleReativar(c.id)}
                className="text-xs text-zinc-600 hover:text-zinc-400 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors">
                {c.name} · reativar
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {modal.aberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-white font-bold">{modal.editando ? "Editar estilo" : "Novo estilo"}</h2>
              <button onClick={() => setModal({ aberto: false, editando: null })} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Foto</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
                    {fotoPreview
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={fotoPreview} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sem foto</div>}
                  </div>
                  <label className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg border border-zinc-700 cursor-pointer transition-colors">
                    Escolher foto
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)) } }} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Degradê americano" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Categoria</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls}>
                    <option value="">Selecionar...</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Dificuldade</label>
                  <select value={dificuldade} onChange={e => setDificuldade(e.target.value)} className={inputCls}>
                    <option value="">Selecionar...</option>
                    {DIFICULDADES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Duração (min)</label>
                  <input type="number" value={duracao} onChange={e => setDuracao(e.target.value)} placeholder="30" className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Ordem</label>
                  <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="0" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Link Instagram</label>
                <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className={inputCls} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Descrição</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Instruções técnicas</label>
                <textarea value={instrucoes} onChange={e => setInstrucoes(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Tags (separadas por vírgula)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="fade, degradê, skin" className={inputCls} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <button type="button" onClick={() => setAtivo(p => !p)}
                  className={`w-10 h-6 rounded-full relative transition-colors ${ativo ? "bg-amber-500" : "bg-zinc-700"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${ativo ? "left-5" : "left-1"}`} />
                </button>
                <span className="text-zinc-300 text-sm">Ativo na galeria</span>
              </div>
              {erro && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erro}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal({ aberto: false, editando: null })}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm">Cancelar</button>
                <button type="submit" disabled={salvando || uploadando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm">
                  {uploadando ? "Enviando foto..." : salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {fotoExpandida && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setFotoExpandida(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoExpandida} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button onClick={() => setFotoExpandida(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl">✕</button>
        </div>
      )}
    </>
  )
}

// ── Org view ─────────────────────────────────────────────────────────────────

function OrgGaleria() {
  const [cortes, setCortes] = useState<CorteComOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [tabFiltro, setTabFiltro] = useState<"todos" | "ativos" | "disponiveis">("todos")
  const [detalhe, setDetalhe] = useState<CorteComOrg | null>(null)
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [barbeirosAtribuidos, setBarbeirosAtribuidos] = useState<string[]>([])
  const [customFotoFile, setCustomFotoFile] = useState<File | null>(null)
  const [customFotoPreview, setCustomFotoPreview] = useState<string | null>(null)
  const [salvandoBarbeiros, setSalvandoBarbeiros] = useState(false)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null)

  const fetchCortes = useCallback(() => {
    setLoading(true)
    fetch("/api/galeria-org")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCortes(d) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchCortes() }, [fetchCortes])

  // Load barbers for establishment when detail opens
  useEffect(() => {
    if (!detalhe) { setBarbeiros([]); setBarbeirosAtribuidos([]); setCustomFotoFile(null); setCustomFotoPreview(null); return }
    setCustomFotoPreview(detalhe.orgCorte?.customPhotoUrl ?? detalhe.photoUrl)
    // Fetch all professionals in this establishment, filter to barber roles
    fetch("/api/equipe")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const barberRoles = ["BARBER_CLT", "BARBER_MEI", "AUTONOMO", "ORG_OWNER", "UNIT_MANAGER"]
          setBarbeiros(d.filter((u: { role: string; isActive: boolean }) => barberRoles.includes(u.role) && u.isActive))
        }
      })
    // Fetch currently assigned barbers
    if (detalhe.orgCorte?.isEnabled) {
      fetch(`/api/galeria-org/${detalhe.id}/barbeiros`)
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setBarbeirosAtribuidos(d) })
    } else {
      setBarbeirosAtribuidos([])
    }
  }, [detalhe])

  async function toggleCorte(c: CorteComOrg) {
    const isEnabled = c.orgCorte?.isEnabled
    setTogglingId(c.id)
    try {
      if (!isEnabled) {
        await fetch(`/api/galeria-org/${c.id}`, { method: "POST" })
      } else {
        await fetch(`/api/galeria-org/${c.id}`, { method: "DELETE" })
      }
      fetchCortes()
      if (detalhe?.id === c.id) setDetalhe(null)
    } finally {
      setTogglingId(null)
    }
  }

  async function salvarBarbeiros() {
    if (!detalhe) return
    setSalvandoBarbeiros(true)
    try {
      await fetch(`/api/galeria-org/${detalhe.id}/barbeiros`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: barbeirosAtribuidos }),
      })
      fetchCortes()
    } finally {
      setSalvandoBarbeiros(false)
    }
  }

  async function enviarFotoCustom() {
    if (!customFotoFile || !detalhe) return
    setUploadandoFoto(true)
    try {
      const fd = new FormData(); fd.append("foto", customFotoFile)
      await fetch(`/api/galeria-org/${detalhe.id}/foto`, { method: "POST", body: fd })
      fetchCortes()
    } finally {
      setUploadandoFoto(false); setCustomFotoFile(null)
    }
  }

  function toggleBarbeiro(userId: string) {
    setBarbeirosAtribuidos(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const visíveis = cortes.filter(c => {
    const textOk = !filtro || c.name.toLowerCase().includes(filtro.toLowerCase()) || (c.category ?? "").toLowerCase().includes(filtro.toLowerCase())
    if (!textOk) return false
    if (tabFiltro === "ativos") return c.orgCorte?.isEnabled
    if (tabFiltro === "disponiveis") return !c.orgCorte?.isEnabled
    return true
  })

  const totalAtivos = cortes.filter(c => c.orgCorte?.isEnabled).length
  const groups = [...new Set(visíveis.map(c => c.category || "Geral"))]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Galeria de Cortes</h1>
          <p className="text-zinc-500 text-sm">{totalAtivos} estilo{totalAtivos !== 1 ? "s" : ""} ativado{totalAtivos !== 1 ? "s" : ""} · {cortes.length} disponíveis na plataforma</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {([["todos", "Todos"], ["ativos", "Oferecemos"], ["disponiveis", "Disponíveis"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTabFiltro(key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${tabFiltro === key ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"}`}>
              {label}
              {key === "ativos" && totalAtivos > 0 && <span className="ml-1.5 bg-black/20 px-1 rounded">{totalAtivos}</span>}
            </button>
          ))}
        </div>
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar..."
          className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-amber-500 placeholder:text-zinc-600 w-48" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Carregando...</div>
      ) : visíveis.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm">Nenhum resultado</div>
      ) : (
        <div className="space-y-6">
          {groups.map(cat => (
            <div key={cat}>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2.5">{cat}</p>
              <div className="grid grid-cols-4 gap-3">
                {visíveis.filter(c => (c.category || "Geral") === cat).map(c => {
                  const enabled = c.orgCorte?.isEnabled
                  const foto = c.orgCorte?.customPhotoUrl ?? c.photoUrl
                  const barbCount = c.orgCorte?.barbeiros?.length ?? 0
                  return (
                    <div key={c.id}
                      className={`bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${enabled ? "border-amber-500/30" : "border-zinc-800 hover:border-zinc-600"}`}>
                      <div className="h-32 bg-zinc-800 relative overflow-hidden cursor-zoom-in"
                        onClick={() => foto && setFotoExpandida(foto)}>
                        {foto
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={foto} alt={c.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sem foto</div>}
                        {enabled && <div className="absolute inset-0 ring-2 ring-amber-500/30 ring-inset" />}
                        {c.orgCorte?.customPhotoUrl && (
                          <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 bg-amber-500/80 text-black rounded font-medium">CUSTOM</span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-white text-sm font-medium truncate">{c.orgCorte?.customName ?? c.name}</div>
                        <div className="text-zinc-600 text-xs mt-0.5">{c.durationMin ? `${c.durationMin} min` : ""} {c.difficulty ? `· ${c.difficulty}` : ""}</div>
                        {enabled && barbCount > 0 && (
                          <div className="text-amber-400/70 text-xs mt-1">{barbCount} barbeiro{barbCount !== 1 ? "s" : ""}</div>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => toggleCorte(c)}
                            disabled={togglingId === c.id}
                            className={`flex-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${enabled ? "bg-amber-500/20 text-amber-400 hover:bg-red-500/20 hover:text-red-400" : "bg-zinc-800 text-zinc-400 hover:bg-amber-500/20 hover:text-amber-400"}`}>
                            {togglingId === c.id ? "..." : enabled ? "Ativado ✓" : "Ativar"}
                          </button>
                          {enabled && (
                            <button onClick={() => setDetalhe(c)}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg transition-colors">
                              ✏
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setDetalhe(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <div>
                <h2 className="text-white font-bold">{detalhe.orgCorte?.customName ?? detalhe.name}</h2>
                <p className="text-zinc-500 text-xs">{detalhe.category} {detalhe.difficulty ? `· ${detalhe.difficulty}` : ""}</p>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Foto customizada */}
              <div>
                <div className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Foto para sua organização</div>
                <div className="h-40 bg-zinc-800 rounded-xl overflow-hidden mb-2 relative">
                  {customFotoPreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={customFotoPreview} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">Sem foto</div>}
                  {detalhe.orgCorte?.customPhotoUrl && (
                    <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 bg-amber-500/80 text-black rounded font-medium">SUA FOTO</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg border border-zinc-700 cursor-pointer transition-colors">
                    {customFotoFile ? "Foto selecionada ✓" : "Escolher foto"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setCustomFotoFile(f); setCustomFotoPreview(URL.createObjectURL(f)) } }} />
                  </label>
                  {customFotoFile && (
                    <button onClick={enviarFotoCustom} disabled={uploadandoFoto}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-3 py-2 rounded-lg text-xs transition-colors">
                      {uploadandoFoto ? "Enviando..." : "Salvar foto"}
                    </button>
                  )}
                </div>
                {detalhe.orgCorte?.customPhotoUrl && !customFotoFile && (
                  <p className="text-zinc-600 text-xs mt-1.5">Foto personalizada da sua organização. A foto original da plataforma não é alterada.</p>
                )}
              </div>

              {/* Barbeiros */}
              <div>
                <div className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Barbeiros que fazem este estilo</div>
                {barbeiros.length === 0 ? (
                  <p className="text-zinc-600 text-sm">Nenhum profissional cadastrado no estabelecimento.</p>
                ) : (
                  <div className="space-y-2">
                    {barbeiros.map(b => {
                      const ativo = barbeirosAtribuidos.includes(b.id)
                      return (
                        <div key={b.id} onClick={() => toggleBarbeiro(b.id)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${ativo ? "bg-amber-500/10 border-amber-500/30" : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"}`}>
                          <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                            {b.image
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={b.image} alt={b.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-bold">{b.name[0]}</div>}
                          </div>
                          <span className={`text-sm flex-1 ${ativo ? "text-white font-medium" : "text-zinc-400"}`}>{b.name}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${ativo ? "bg-amber-500 border-amber-500" : "border-zinc-600"}`}>
                            {ativo && <span className="text-black text-xs font-bold">✓</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {barbeiros.length > 0 && (
                  <button onClick={salvarBarbeiros} disabled={salvandoBarbeiros}
                    className="mt-3 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                    {salvandoBarbeiros ? "Salvando..." : "Salvar barbeiros"}
                  </button>
                )}
              </div>

              {/* Detalhes do estilo */}
              {(detalhe.description || detalhe.instructions || detalhe.tags.length > 0) && (
                <div>
                  <div className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Sobre o estilo</div>
                  {detalhe.description && <p className="text-zinc-400 text-sm leading-relaxed mb-2">{detalhe.description}</p>}
                  {detalhe.instructions && (
                    <div className="bg-zinc-800 rounded-xl p-3 text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap mb-2">{detalhe.instructions}</div>
                  )}
                  {detalhe.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {detalhe.tags.map(t => <span key={t} className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">{t}</span>)}
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => toggleCorte(detalhe)}
                className="w-full text-xs text-red-500/60 hover:text-red-400 py-2 rounded-lg border border-zinc-800 hover:border-red-500/20 transition-colors">
                Remover este estilo da minha organização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {fotoExpandida && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setFotoExpandida(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoExpandida} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button onClick={() => setFotoExpandida(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl">✕</button>
        </div>
      )}
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GaleriaPage() {
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  if (status === "loading") {
    return <DashboardLayout><div className="text-center py-16 text-zinc-600">Carregando...</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      {isAdmin ? <AdminGaleria /> : <OrgGaleria />}
    </DashboardLayout>
  )
}
