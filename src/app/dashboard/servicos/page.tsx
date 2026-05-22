"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const categoriaStyle: Record<string, string> = {
  Corte: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  Combo: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Barba: "bg-green-500/10 text-green-400 border border-green-500/20",
  Química: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  Tratamento: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  Premium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
}

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

export default function ServicosPage() {
  const [servicos, setServicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
    return (
      <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors ${dim ? "opacity-50" : ""}`}>
        {/* Foto do serviço */}
        {servico.photoUrl ? (
          <div className="h-32 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={servico.photoUrl} alt={servico.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-20 bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-600 text-xs">Sem foto</span>
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${categoriaStyle[servico.category] ?? "bg-zinc-700 text-zinc-400"}`}>
              {servico.category || "Geral"}
            </span>
            {servico.availableHome && (
              <span className="text-xs text-teal-400">🚗</span>
            )}
          </div>
          <div className={`font-semibold mb-1 ${dim ? "text-zinc-400" : "text-white"}`}>{servico.name}</div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
            <div className={`font-bold ${dim ? "text-zinc-500" : "text-amber-400"}`}>R$ {servico.price}</div>
            <div className="text-zinc-500 text-xs">{servico.durationMin} min</div>
          </div>
          <button onClick={() => handleEditar(servico)}
            className="w-full mt-3 text-xs text-zinc-500 hover:text-zinc-300 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
            ✏️ Editar
          </button>
        </div>
      </div>
    )
  }

  const ativos = servicos.filter(s => s.isActive)
  const inativos = servicos.filter(s => !s.isActive)

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Serviços</h1>
          <p className="text-zinc-500 text-sm">{ativos.length} ativos{inativos.length > 0 ? `, ${inativos.length} desabilitados` : ""}</p>
        </div>
        <button onClick={handleNovo}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Novo serviço
        </button>
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
          <div className="grid grid-cols-3 gap-3">
            {ativos.map(s => <ServiceCard key={s.id} servico={s} />)}
          </div>
          {inativos.length > 0 && (
            <div>
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">Desabilitados</p>
              <div className="grid grid-cols-3 gap-3">
                {inativos.map(s => <ServiceCard key={s.id} servico={s} dim />)}
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
    </DashboardLayout>
  )
}
