"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const cortesMock = [
  { id: "1", nome: "Fade Alto", categoria: "Moderno", dificuldade: "Alta", duracao: 40, tags: ["moderno", "popular"], compat: { oval: 97, redondo: 55, quadrado: 88, coracao: 70 }, instrucoes: "1. Lavar e secar o cabelo\n2. Definir a linha do fade com máquina 0000\n3. Blend progressivo com guias 0,5 — 1 — 1,5\n4. Cortar o topo com tesoura\n5. Finalizar com navalha" },
  { id: "2", nome: "Degradê Médio", categoria: "Moderno", dificuldade: "Média", duracao: 35, tags: ["versátil", "moderno"], compat: { oval: 91, redondo: 60, quadrado: 82, coracao: 68 }, instrucoes: "1. Definir ponto de transição na têmpora\n2. Blend com guias 0,5 — 1 — 2\n3. Topo entre 4 e 6 cm\n4. Finalizar laterais com navalha" },
  { id: "3", nome: "Undercut Texturizado", categoria: "Tendência", dificuldade: "Média", duracao: 45, tags: ["arrojado", "tendência"], compat: { oval: 88, redondo: 40, quadrado: 70, coracao: 65 }, instrucoes: "1. Dividir cabelo com pente na altura do undercut\n2. Raspar lateral com máquina 0\n3. Cortar topo em camadas para textura\n4. Modelar com pomada texturizadora" },
  { id: "4", nome: "Pompadour Moderno", categoria: "Clássico", dificuldade: "Alta", duracao: 50, tags: ["clássico", "elegante"], compat: { oval: 81, redondo: 38, quadrado: 60, coracao: 55 }, instrucoes: "1. Fade baixo ou médio nas laterais\n2. Topo mínimo 7cm na frente\n3. Secar com escova redonda para volume\n4. Fixar com pomada alta fixação" },
  { id: "5", nome: "Máquina Zero", categoria: "Prático", dificuldade: "Fácil", duracao: 20, tags: ["rápido", "prático"], compat: { oval: 75, redondo: 72, quadrado: 78, coracao: 65 }, instrucoes: "1. Definir se zero absoluto ou guia 0,5\n2. Passar máquina contra o crescimento\n3. Revisar nuca com navalha" },
  { id: "6", nome: "Social + Barba", categoria: "Combo", dificuldade: "Média", duracao: 60, tags: ["combo", "formal"], compat: { oval: 79, redondo: 65, quadrado: 82, coracao: 74 }, instrucoes: "1. Corte social nas laterais e topo\n2. Toalha quente 3 minutos\n3. Creme de barba e design com navalha\n4. Finalizar com óleo de barba" },
  { id: "7", nome: "Crespo Definido", categoria: "Natural", dificuldade: "Alta", duracao: 45, tags: ["natural", "crespo"], compat: { oval: 70, redondo: 55, quadrado: 65, coracao: 60 }, instrucoes: "1. Lavar com shampoo sem sulfato\n2. Cortar em seções com twist\n3. Secar com difusor\n4. Aplicar creme de definição" },
  { id: "8", nome: "Fade + Hidratação", categoria: "Premium", dificuldade: "Alta", duracao: 70, tags: ["premium", "tratamento"], compat: { oval: 90, redondo: 60, quadrado: 80, coracao: 72 }, instrucoes: "1. Fade alto padrão\n2. Máscara de hidratação 15 minutos com touca\n3. Enxaguar e secar com difusor\n4. Leave-in protetor térmico" },
  { id: "9", nome: "Franja Moderna", categoria: "Tendência", dificuldade: "Média", duracao: 40, tags: ["jovem", "tendência"], compat: { oval: 78, redondo: 42, quadrado: 65, coracao: 55 }, instrucoes: "1. Fade médio nas laterais\n2. Topo com franja mínimo 8cm\n3. Modelar franja com pomada\n4. Fixar com cera média fixação" },
]

const categorias = ["Todos", "Moderno", "Clássico", "Tendência", "Prático", "Combo", "Natural", "Premium"]

const dificuldadeStyle: Record<string, string> = {
  Fácil: "text-green-400",
  Média: "text-amber-400",
  Alta: "text-red-400",
}

export default function GaleriaPage() {
  const [categoriaSel, setCategoriaSel] = useState("Todos")
  const [corteSel, setCorteSel] = useState<typeof cortesMock[0] | null>(null)
  const [modalNovo, setModalNovo] = useState(false)
  const [abaDetalhe, setAbaDetalhe] = useState<"cliente" | "barbeiro">("cliente")

  const cortesFiltrados = categoriaSel === "Todos"
    ? cortesMock
    : cortesMock.filter(c => c.categoria === categoriaSel)

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Galeria de Cortes</h1>
          <p className="text-zinc-500 text-sm">{cortesMock.length} cortes cadastrados · cliente escolhe · barbeiro recebe instruções</p>
        </div>
        <button
          onClick={() => setModalNovo(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Novo corte
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-4">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaSel(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              categoriaSel === cat
                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de cortes */}
      <div className="grid grid-cols-3 gap-3">
        {cortesFiltrados.map((corte) => (
          <div
            key={corte.id}
            onClick={() => { setCorteSel(corte); setAbaDetalhe("cliente") }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-700 transition-all hover:-translate-y-0.5"
          >
            {/* Imagem simulada */}
            <div className="h-28 bg-zinc-800 flex items-center justify-center text-5xl border-b border-zinc-700">
              ✂️
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-white text-sm font-semibold">{corte.nome}</div>
                  <div className="text-zinc-500 text-xs">{corte.categoria}</div>
                </div>
                <div className={`text-xs font-medium ${dificuldadeStyle[corte.dificuldade]}`}>
                  {corte.dificuldade}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-zinc-600 text-xs">{corte.duracao} min</div>
                <div className="text-xs text-purple-400 font-mono">oval {corte.compat.oval}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal detalhe do corte */}
      {corteSel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div>
                <h2 className="text-white font-bold">{corteSel.nome}</h2>
                <div className="text-zinc-500 text-xs mt-0.5">{corteSel.categoria} · {corteSel.duracao} min · <span className={dificuldadeStyle[corteSel.dificuldade]}>{corteSel.dificuldade}</span></div>
              </div>
              <button onClick={() => setCorteSel(null)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setAbaDetalhe("cliente")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${abaDetalhe === "cliente" ? "text-amber-400 border-b-2 border-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                👤 Para o cliente
              </button>
              <button
                onClick={() => setAbaDetalhe("barbeiro")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${abaDetalhe === "barbeiro" ? "text-amber-400 border-b-2 border-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                ✂️ Para o barbeiro
              </button>
            </div>

            <div className="p-5">
              {abaDetalhe === "cliente" && (
                <div>
                  <div className="h-36 bg-zinc-800 rounded-xl flex items-center justify-center text-6xl mb-4">✂️</div>

                  <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-2">Compatibilidade por biotipo</div>
                  <div className="space-y-2 mb-4">
                    {Object.entries(corteSel.compat).map(([biotipo, pct]) => (
                      <div key={biotipo} className="flex items-center gap-3">
                        <div className="text-zinc-400 text-xs w-16 capitalize">{biotipo}</div>
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="text-purple-400 text-xs font-mono w-8 text-right">{pct}%</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-2">Tags</div>
                  <div className="flex gap-2 flex-wrap">
                    {corteSel.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {abaDetalhe === "barbeiro" && (
                <div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                    <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-2">✂️ Passo a passo técnico</div>
                    <div className="space-y-2">
                      {corteSel.instrucoes.split("\n").map((passo, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <span className="text-zinc-300 text-sm">{passo.replace(/^\d+\.\s/, "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400">
                    <div className="text-zinc-500 text-xs font-mono mb-1">Duração estimada</div>
                    <div className="text-white font-medium">{corteSel.duracao} minutos</div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setCorteSel(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Fechar
                </button>
                <button className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Selecionar para agendamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo corte */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Corte</h2>
              <button onClick={() => setModalNovo(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome do corte *</label>
                <input placeholder="Ex: Fade Alto" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Categoria</label>
                  <select className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                    {categorias.filter(c => c !== "Todos").map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Duração (min)</label>
                  <input type="number" placeholder="40" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Instruções para o barbeiro</label>
                <textarea rows={4} placeholder="Descreva o passo a passo técnico..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalNovo(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button onClick={() => setModalNovo(false)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">Cadastrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}