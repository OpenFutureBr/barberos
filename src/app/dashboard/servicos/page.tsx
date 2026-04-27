"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const servicosMock = [
  { id: "1", nome: "Corte de Cabelo", categoria: "Corte", preco: 65, duracao: 40, domicilio: true, ativo: true },
  { id: "2", nome: "Corte + Barba", categoria: "Combo", preco: 95, duracao: 60, domicilio: true, ativo: true },
  { id: "3", nome: "Barba Completa", categoria: "Barba", preco: 45, duracao: 30, domicilio: true, ativo: true },
  { id: "4", nome: "Progressiva", categoria: "Química", preco: 180, duracao: 120, domicilio: false, ativo: true },
  { id: "5", nome: "Hidratação", categoria: "Tratamento", preco: 60, duracao: 45, domicilio: false, ativo: true },
  { id: "6", nome: "Fade + Hidratação", categoria: "Premium", preco: 110, duracao: 70, domicilio: false, ativo: true },
]

const categoriaStyle: Record<string, string> = {
  Corte: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  Combo: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Barba: "bg-green-500/10 text-green-400 border border-green-500/20",
  Química: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  Tratamento: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  Premium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
}

export default function ServicosPage() {
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [categoria, setCategoria] = useState("Corte")
  const [preco, setPreco] = useState("")
  const [duracao, setDuracao] = useState("")
  const [domicilio, setDomicilio] = useState(false)

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setModalAberto(false)
    setNome("")
    setCategoria("Corte")
    setPreco("")
    setDuracao("")
    setDomicilio(false)
  }

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Serviços</h1>
          <p className="text-zinc-500 text-sm">{servicosMock.length} serviços cadastrados</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Novo serviço
        </button>
      </div>

      {/* Grid de serviços */}
      <div className="grid grid-cols-3 gap-3">
        {servicosMock.map((servico) => (
          <div key={servico.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">

            <div className="flex items-start justify-between mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${categoriaStyle[servico.categoria] ?? "bg-zinc-700 text-zinc-400"}`}>
                {servico.categoria}
              </span>
              {servico.domicilio && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  🚗 Domicílio
                </span>
              )}
            </div>

            <div className="text-white font-semibold mb-1">{servico.nome}</div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
              <div className="text-amber-400 font-bold">R$ {servico.preco}</div>
              <div className="text-zinc-500 text-xs">{servico.duracao} min</div>
            </div>

          </div>
        ))}
      </div>

      {/* Modal novo serviço */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">

            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Serviço</h2>
              <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-3">

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome do serviço *</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="Ex: Corte + Barba"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Categoria *</label>
                <div className="flex flex-wrap gap-2">
                  {["Corte", "Barba", "Combo", "Química", "Tratamento", "Premium"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoria(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        categoria === cat
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço (R$) *</label>
                  <input
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    required
                    type="number"
                    min="0"
                    placeholder="Ex: 65"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Duração (min) *</label>
                  <input
                    value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                    required
                    type="number"
                    min="0"
                    placeholder="Ex: 40"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Disponível para domicílio */}
              <div
                onClick={() => setDomicilio(!domicilio)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  domicilio
                    ? "bg-teal-500/10 border-teal-500/30"
                    : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  domicilio ? "bg-teal-500 border-teal-500" : "border-zinc-600"
                }`}>
                  {domicilio && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <div className={`text-sm font-medium ${domicilio ? "text-teal-400" : "text-zinc-400"}`}>
                    🚗 Disponível para atendimento a domicílio
                  </div>
                  <div className="text-zinc-600 text-xs">Autônomos poderão oferecer este serviço</div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cadastrar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}