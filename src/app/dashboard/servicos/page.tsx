"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const categoriaGradient: Record<string, string> = {
  Corte: "from-blue-700 to-blue-950",
  Combo: "from-amber-600 to-amber-950",
  Barba: "from-emerald-700 to-emerald-950",
  Química: "from-purple-700 to-purple-950",
  Tratamento: "from-teal-700 to-teal-950",
  Premium: "from-yellow-600 to-amber-950",
}

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

export default function ServicosPage() {
  const [servicos, setServicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [servicoEditando, setServicoEditando] = useState<any | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const [nome, setNome] = useState("")
  const [categoria, setCategoria] = useState("Corte")
  const [preco, setPreco] = useState("")
  const [duracao, setDuracao] = useState("")
  const [domicilio, setDomicilio] = useState(false)
  const [isAtivo, setIsAtivo] = useState(true)

  // Foto
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)

  // Lightbox
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null)

  useEffect(() => { buscarServicos() }, [])

  async function buscarServicos() {
    setLoading(true)
    try {
      const res = await fetch("/api/servicos")
      const data = await res.json()
      setServicos(Array.isArray(data) ? data : [])
    } catch {
      setErro("Erro ao carregar serviços")
    } finally {
      setLoading(false)
    }
  }

  function handleNovo() {
    setServicoEditando(null)
    setNome(""); setCategoria("Corte"); setPreco(""); setDuracao("")
    setDomicilio(false); setIsAtivo(true); setErro("")
    setFotoPreview(null); setFotoFile(null)
    setModalAberto(true)
  }

  function handleEditar(servico: any) {
    setServicoEditando(servico)
    setNome(servico.name)
    setCategoria(servico.category || "Corte")
    setPreco(String(servico.price))
    setDuracao(String(servico.durationMin))
    setDomicilio(servico.availableHome)
    setIsAtivo(servico.isActive)
    setFotoPreview(servico.photoUrl ?? null)
    setFotoFile(null)
    setErro("")
    setModalAberto(true)
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvando(true); setErro("")
    try {
      // 1. Salva o serviço
      const method = servicoEditando ? "PUT" : "POST"
      const res = await fetch("/api/servicos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: servicoEditando?.id,
          name: nome, category: categoria,
          price: preco, durationMin: duracao,
          availableHome: domicilio, isActive: isAtivo,
        }),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      const salvo = await res.json()

      // 2. Faz upload da foto se selecionada
      if (fotoFile && salvo.id) {
        setUploadandoFoto(true)
        const fd = new FormData()
        fd.append("foto", fotoFile)
        fd.append("servicoId", salvo.id)
        const upRes = await fetch("/api/servicos/foto", { method: "POST", body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) { setErro(upData.error || "Erro ao enviar foto"); return }
        setUploadandoFoto(false)
      }

      await buscarServicos()
      setModalAberto(false)
    } catch {
      setErro("Erro ao salvar serviço.")
    } finally {
      setSalvando(false)
      setUploadandoFoto(false)
    }
  }

  function ServiceCard({ servico, dim = false }: { servico: any; dim?: boolean }) {
    const gradient = categoriaGradient[servico.category] ?? "from-zinc-600 to-zinc-900"

    return (
      <div
        onClick={() => handleEditar(servico)}
        className={`relative rounded-lg overflow-hidden border border-zinc-700/60 cursor-pointer group transition-all hover:border-zinc-500 hover:shadow-lg hover:shadow-black/40 select-none ${dim ? "opacity-40 grayscale" : ""}`}
        style={{ aspectRatio: "2.8 / 1" }}
      >
        {/* Base */}
        <div className="absolute inset-0 bg-zinc-900" />
        {/* Diagonal texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "6px 6px" }} />

        {/* Left accent stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradient}`} />

        {/* Header strip */}
        <div className={`absolute top-0 left-1 right-0 h-5 bg-gradient-to-r ${gradient} flex items-center px-2 justify-between`}>
          <span className="text-white/70 text-[8px] tracking-[0.15em] uppercase font-medium">Barberos</span>
          <span className="text-white/50 text-[8px] tracking-wider uppercase">{servico.category || "Geral"}</span>
        </div>

        {/* Body */}
        <div className="absolute top-5 left-1 right-0 bottom-0 flex">
          {/* Photo */}
          <div className="w-[22%] flex-shrink-0 p-1.5">
            <div
              className={`w-full h-full rounded overflow-hidden border border-zinc-700/60 bg-zinc-800 ${servico.photoUrl ? "cursor-zoom-in" : ""}`}
              onClick={servico.photoUrl ? (e) => { e.stopPropagation(); setFotoExpandida(servico.photoUrl) } : undefined}
            >
              {servico.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={servico.photoUrl} alt={servico.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-lg opacity-20">✂</span>
                </div>
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="w-px bg-zinc-800 my-1.5 flex-shrink-0" />

          {/* Fields */}
          <div className="flex-1 px-2.5 flex items-center gap-3 min-w-0">
            {/* Nome */}
            <div className="flex-1 min-w-0">
              <div className="text-zinc-600 text-[7px] uppercase tracking-wider mb-0.5">Serviço</div>
              <div className={`font-bold text-[11px] leading-tight break-words line-clamp-2 ${dim ? "text-zinc-400" : "text-white"}`}>
                {servico.name}
              </div>
              {servico.availableHome && (
                <span className="text-[7px] text-teal-500 mt-0.5 block">✦ Domicílio</span>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-zinc-800 flex-shrink-0" />

            {/* Valor */}
            <div className="flex-shrink-0 text-center">
              <div className="text-zinc-600 text-[7px] uppercase tracking-wider mb-0.5">Valor</div>
              <div className={`font-bold text-sm leading-none ${dim ? "text-zinc-500" : "text-amber-400"}`}>
                R$&nbsp;{Number(servico.price).toFixed(0)}
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-zinc-800 flex-shrink-0" />

            {/* Duração */}
            <div className="flex-shrink-0 text-center">
              <div className="text-zinc-600 text-[7px] uppercase tracking-wider mb-0.5">Duração</div>
              <div className="text-white font-semibold text-xs leading-none">
                {servico.durationMin}<span className="text-zinc-600 text-[10px]"> min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div className="absolute bottom-0 left-1 right-0 h-px bg-zinc-800/60" />
      </div>
    )
  }

  const ativos = servicos.filter(s => s.isActive)
  const inativos = servicos.filter(s => !s.isActive)

  const filtrar = (lista: any[]) =>
    busca.trim()
      ? lista.filter(s => s.name.toLowerCase().includes(busca.toLowerCase()) || (s.category ?? "").toLowerCase().includes(busca.toLowerCase()))
      : lista

  return (
    <DashboardLayout>
      <div className="mb-4">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Serviços</h1>
            <p className="text-zinc-500 text-sm">{ativos.length} ativos{inativos.length > 0 ? `, ${inativos.length} desabilitados` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar serviço..."
                className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg pl-8 pr-3 py-2 outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600 w-48" />
              {busca && <button onClick={() => setBusca("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">✕</button>}
            </div>
            <button onClick={handleNovo} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              + Novo serviço
            </button>
          </div>
        </div>
        {/* Mobile header — busca + botão */}
        <div className="md:hidden flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg pl-8 pr-3 py-2 outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
            {busca && <button onClick={() => setBusca("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">✕</button>}
          </div>
          <button onClick={handleNovo} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap">
            + Novo
          </button>
        </div>
      </div>
      </div>

      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">Carregando...</div>
      ) : servicos.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <div className="text-zinc-600 text-sm mb-2">Nenhum serviço cadastrado</div>
          <button onClick={handleNovo} className="text-amber-400 text-sm hover:text-amber-300 transition-colors">
            Cadastrar primeiro serviço →
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const ativosFiltrados = filtrar(ativos)
            if (ativosFiltrados.length === 0 && busca) {
              return <p className="text-zinc-600 text-sm text-center py-4">Nenhum serviço encontrado para "{busca}"</p>
            }
            const cats = [...new Set(ativosFiltrados.map(s => s.category || "Geral"))]
            return cats.map(cat => {
              const lista = ativosFiltrados.filter(s => (s.category || "Geral") === cat)
              return (
                <div key={cat}>
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2.5">{cat}</p>
                  {/* Desktop: grid 3 colunas */}
                  <div className="hidden md:grid md:grid-cols-3 gap-3">
                    {lista.map(s => <ServiceCard key={s.id} servico={s} />)}
                  </div>
                  {/* Mobile: carrossel horizontal, 1 linha */}
                  <div className="md:hidden flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none snap-x snap-mandatory">
                    {lista.map(s => (
                      <div key={s.id} className="flex-shrink-0 snap-center w-[80vw]">
                        <ServiceCard servico={s} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          })()}
          {inativos.length > 0 && filtrar(inativos).length > 0 && (
            <div>
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-2">Desabilitados</p>
              <div className="hidden md:grid md:grid-cols-3 gap-3">
                {filtrar(inativos).map(s => <ServiceCard key={s.id} servico={s} dim />)}
              </div>
              <div className="md:hidden flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none snap-x snap-mandatory">
                {filtrar(inativos).map(s => (
                  <div key={s.id} className="flex-shrink-0 snap-center w-[80vw]">
                    <ServiceCard servico={s} dim />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-white font-bold">{servicoEditando ? "Editar Serviço" : "Novo Serviço"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">

              {/* Foto */}
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Foto do serviço</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-700">
                    {fotoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-600 text-xs text-center px-1">Sem foto</span>
                    )}
                  </div>
                  <div>
                    <label className={`inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg border border-zinc-700 transition-colors cursor-pointer ${uploadandoFoto ? "opacity-50" : ""}`}>
                      {uploadandoFoto ? "Enviando..." : "Escolher foto"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={handleFotoChange} disabled={uploadandoFoto} />
                    </label>
                    <p className="text-zinc-600 text-xs mt-1">PNG, JPG ou WebP</p>
                    {fotoFile && (
                      <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(servicoEditando?.photoUrl ?? null) }}
                        className="text-zinc-600 hover:text-zinc-400 text-xs mt-0.5 transition-colors">
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome do serviço *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required
                  placeholder="Ex: Corte + Barba" className={inputCls} />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Categoria *</label>
                <div className="flex flex-wrap gap-2">
                  {["Corte", "Barba", "Combo", "Química", "Tratamento", "Premium"].map(cat => (
                    <button key={cat} type="button" onClick={() => setCategoria(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        categoria === cat ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço (R$) *</label>
                  <input value={preco} onChange={e => setPreco(e.target.value)} required
                    type="number" min="0" placeholder="65" className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Duração (min) *</label>
                  <input value={duracao} onChange={e => setDuracao(e.target.value)} required
                    type="number" min="0" placeholder="40" className={inputCls} />
                </div>
              </div>

              <div onClick={() => setDomicilio(!domicilio)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  domicilio ? "bg-teal-500/10 border-teal-500/30" : "bg-zinc-800 border-zinc-700"
                }`}>
                <div className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 flex-shrink-0 ${domicilio ? "bg-teal-500 justify-end" : "bg-zinc-700 justify-start"}`}>
                  <div className="w-4 h-4 bg-white rounded-full shadow" />
                </div>
                <div>
                  <div className={`text-sm font-medium ${domicilio ? "text-teal-400" : "text-zinc-400"}`}>Disponível a domicílio</div>
                  <div className="text-zinc-600 text-xs">Aparece nos agendamentos domiciliares</div>
                </div>
              </div>

              <div onClick={() => setIsAtivo(!isAtivo)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isAtivo ? "bg-zinc-800 border-zinc-700" : "bg-red-500/5 border-red-500/20"
                }`}>
                <div className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 flex-shrink-0 ${isAtivo ? "bg-amber-500 justify-end" : "bg-zinc-700 justify-start"}`}>
                  <div className="w-4 h-4 bg-white rounded-full shadow" />
                </div>
                <div>
                  <div className={`text-sm font-medium ${isAtivo ? "text-white" : "text-red-400"}`}>
                    {isAtivo ? "Serviço ativo" : "Serviço desabilitado"}
                  </div>
                  <div className="text-zinc-600 text-xs">Aparece no agendamento</div>
                </div>
              </div>

              {erro && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erro}</div>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando || uploadandoFoto}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {uploadandoFoto ? "Enviando foto..." : salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {fotoExpandida && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setFotoExpandida(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoExpandida} alt="Foto expandida" className="max-w-full max-h-full rounded-xl object-contain" />
          <button
            onClick={() => setFotoExpandida(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none"
          >✕</button>
        </div>
      )}
    </DashboardLayout>
  )
}
