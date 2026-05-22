"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

type Corte = {
  id: string; name: string; description: string | null; photoUrl: string | null
  instagramUrl: string | null; serviceId: string | null; instructions: string | null
  durationMin: number | null; difficulty: string | null; category: string | null
  tags: string[]; isActive: boolean
  service: { id: string; name: string; category: string | null } | null
}
type Servico = { id: string; name: string; category: string | null }

const DIFICULDADES = ["Iniciante", "Intermediário", "Avançado", "Expert"]
const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

function fmtInstagram(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes("instagram.com")) {
      const match = u.pathname.match(/\/p\/([^/]+)/)
      return match ? `https://www.instagram.com/p/${match[1]}/embed` : null
    }
  } catch {}
  return null
}

export default function GaleriaPage() {
  const [cortes, setCortes] = useState<Corte[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ aberto: boolean; editando: Corte | null }>({ aberto: false, editando: null })
  const [salvando, setSalvando] = useState(false)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [erroMsg, setErroMsg] = useState("")
  const [filtro, setFiltro] = useState("")
  const [detalhe, setDetalhe] = useState<Corte | null>(null)

  // Form
  const [nome, setNome] = useState("")
  const [desc, setDesc] = useState("")
  const [categoria, setCategoria] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [instrucoes, setInstrucoes] = useState("")
  const [duracao, setDuracao] = useState("")
  const [dificuldade, setDificuldade] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [tags, setTags] = useState("")
  const [ativo, setAtivo] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/galeria").then(r => r.json()),
      fetch("/api/servicos").then(r => r.json()),
    ]).then(([g, s]) => {
      if (Array.isArray(g)) setCortes(g)
      if (Array.isArray(s)) setServicos(s)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  function abrirNovo() {
    setModal({ aberto: true, editando: null })
    setNome(""); setDesc(""); setCategoria(""); setServiceId(""); setInstrucoes("")
    setDuracao(""); setDificuldade(""); setInstagramUrl(""); setTags(""); setAtivo(true)
    setFotoFile(null); setFotoPreview(null); setErroMsg("")
  }

  function abrirEditar(c: Corte) {
    setModal({ aberto: true, editando: c })
    setNome(c.name); setDesc(c.description ?? ""); setCategoria(c.category ?? "")
    setServiceId(c.serviceId ?? ""); setInstrucoes(c.instructions ?? "")
    setDuracao(c.durationMin ? String(c.durationMin) : "")
    setDificuldade(c.difficulty ?? ""); setInstagramUrl(c.instagramUrl ?? "")
    setTags(c.tags.join(", ")); setAtivo(c.isActive)
    setFotoFile(null); setFotoPreview(c.photoUrl); setErroMsg("")
  }

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!nome.trim()) { setErroMsg("Nome obrigatório"); return }
    setSalvando(true); setErroMsg("")
    try {
      const payload = {
        name: nome.trim(), description: desc || null, category: categoria || null,
        serviceId: serviceId || null, instructions: instrucoes || null,
        durationMin: duracao || null, difficulty: dificuldade || null,
        instagramUrl: instagramUrl || null,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean), isActive: ativo,
      }
      let res: Response
      if (modal.editando) {
        res = await fetch(`/api/galeria/${modal.editando.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      } else {
        res = await fetch("/api/galeria", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      }
      const salvo = await res.json()
      if (!res.ok) { setErroMsg(salvo.error || "Erro ao salvar"); return }

      if (fotoFile && salvo.id) {
        setUploadandoFoto(true)
        const fd = new FormData(); fd.append("foto", fotoFile); fd.append("corteId", salvo.id)
        const upRes = await fetch("/api/galeria/foto", { method: "POST", body: fd })
        const upData = await upRes.json()
        if (upRes.ok) salvo.photoUrl = upData.url
        setUploadandoFoto(false)
      }

      if (modal.editando) setCortes(prev => prev.map(c => c.id === modal.editando!.id ? salvo : c))
      else setCortes(prev => [salvo, ...prev])
      setModal({ aberto: false, editando: null })
    } catch (err) { setErroMsg(String(err)) }
    finally { setSalvando(false); setUploadandoFoto(false) }
  }

  async function handleDesativar(id: string) {
    if (!confirm("Desativar este corte?")) return
    await fetch(`/api/galeria/${id}`, { method: "DELETE" })
    setCortes(prev => prev.map(c => c.id === id ? { ...c, isActive: false } : c))
    setDetalhe(null)
  }

  const cortesVisiveis = cortes.filter(c => c.isActive && (
    !filtro || c.name.toLowerCase().includes(filtro.toLowerCase()) ||
    c.category?.toLowerCase().includes(filtro.toLowerCase()) ||
    c.service?.name.toLowerCase().includes(filtro.toLowerCase())
  ))

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Galeria de Cortes</h1>
          <p className="text-zinc-500 text-sm">{cortesVisiveis.length} cortes · referência visual para clientes e profissionais</p>
        </div>
        <button onClick={abrirNovo} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Novo corte
        </button>
      </div>

      <div className="mb-4">
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar corte, categoria ou serviço..." className={inputCls} />
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Carregando...</div>
      ) : cortesVisiveis.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-zinc-600 text-sm mb-3">Nenhum corte cadastrado</div>
          <button onClick={abrirNovo} className="text-amber-500 text-sm hover:text-amber-400">+ Cadastrar primeiro corte</button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {cortesVisiveis.map(c => (
            <div key={c.id} onClick={() => setDetalhe(c)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors cursor-pointer group">
              <div className="h-36 bg-zinc-800 relative overflow-hidden">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : c.instagramUrl && fmtInstagram(c.instagramUrl) ? (
                  <iframe src={fmtInstagram(c.instagramUrl)!} className="border-0 pointer-events-none"
                    style={{ width: "133%", height: "133%", transform: "scale(0.75)", transformOrigin: "top left" }}
                    scrolling="no" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sem foto</div>
                )}
                {c.difficulty && (
                  <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 bg-black/70 text-zinc-300 rounded">{c.difficulty}</span>
                )}
                {c.instagramUrl && !c.photoUrl && (
                  <span className="absolute top-2 left-2 text-xs px-1.5 py-0.5 bg-purple-500/80 text-white rounded">Instagram</span>
                )}
              </div>
              <div className="p-3">
                <div className="text-white text-sm font-medium truncate">{c.name}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  {c.category && <span className="text-xs text-amber-400/70">{c.category}</span>}
                  {c.service && <span className="text-zinc-600 text-xs">· {c.service.name}</span>}
                </div>
                {c.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {c.tags.slice(0, 2).map(t => <span key={t} className="text-xs bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inativos */}
      {cortes.filter(c => !c.isActive).length > 0 && (
        <div className="mt-6">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-3">Desativados</p>
          <div className="flex gap-2 flex-wrap">
            {cortes.filter(c => !c.isActive).map(c => (
              <button key={c.id} onClick={() => abrirEditar(c)}
                className="text-xs text-zinc-600 hover:text-zinc-400 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors">
                {c.name}
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
              <h2 className="text-white font-bold">{modal.editando ? "Editar corte" : "Novo corte"}</h2>
              <button onClick={() => setModal({ aberto: false, editando: null })} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Foto do corte</label>
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
                    {["Corte", "Barba", "Combo", "Química", "Tratamento", "Premium"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Serviço relacionado</label>
                  <select value={serviceId} onChange={e => setServiceId(e.target.value)} className={inputCls}>
                    <option value="">Nenhum</option>
                    {servicos.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Link Instagram (post com foto do corte)</label>
                <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..." className={inputCls} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Descrição</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Descreva o corte..." className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Instruções técnicas (visível ao profissional)</label>
                <textarea value={instrucoes} onChange={e => setInstrucoes(e.target.value)} rows={3}
                  placeholder="Passos técnicos, maquinário, produtos..." className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Duração (min)</label>
                  <input type="number" value={duracao} onChange={e => setDuracao(e.target.value)} placeholder="30" className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Dificuldade</label>
                  <select value={dificuldade} onChange={e => setDificuldade(e.target.value)} className={inputCls}>
                    <option value="">Selecionar...</option>
                    {DIFICULDADES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
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
              {erroMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erroMsg}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal({ aberto: false, editando: null })}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando || uploadandoFoto}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {uploadandoFoto ? "Enviando foto..." : salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setDetalhe(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">{detalhe.name}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setDetalhe(null); abrirEditar(detalhe) }}
                  className="text-zinc-500 hover:text-zinc-200 text-xs px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors">✏ Editar</button>
                <button onClick={() => setDetalhe(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {detalhe.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detalhe.photoUrl} alt={detalhe.name} className="w-full h-52 object-cover rounded-xl" />
              )}
              {!detalhe.photoUrl && detalhe.instagramUrl && fmtInstagram(detalhe.instagramUrl) && (
                <div className="rounded-xl overflow-hidden bg-white" style={{ height: 320 }}>
                  <iframe src={fmtInstagram(detalhe.instagramUrl)!} className="w-full h-full border-0" scrolling="no" />
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {detalhe.category && <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{detalhe.category}</span>}
                {detalhe.difficulty && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{detalhe.difficulty}</span>}
                {detalhe.durationMin && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{detalhe.durationMin} min</span>}
                {detalhe.service && <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{detalhe.service.name}</span>}
              </div>
              {detalhe.description && <p className="text-zinc-400 text-sm leading-relaxed">{detalhe.description}</p>}
              {detalhe.instructions && (
                <div>
                  <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Instruções técnicas</div>
                  <div className="bg-zinc-800 rounded-xl p-3 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{detalhe.instructions}</div>
                </div>
              )}
              {detalhe.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {detalhe.tags.map(t => <span key={t} className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">{t}</span>)}
                </div>
              )}
              {detalhe.instagramUrl && (
                <a href={detalhe.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-purple-400 text-xs transition-colors flex items-center gap-1">
                  Ver post no Instagram →
                </a>
              )}
              <button onClick={() => handleDesativar(detalhe.id)}
                className="w-full text-xs text-zinc-600 hover:text-red-400 py-2 rounded-lg border border-zinc-800 hover:border-red-500/20 transition-colors">
                Desativar corte
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
