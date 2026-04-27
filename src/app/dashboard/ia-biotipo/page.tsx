"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const biotipos = [
  { id: "oval", label: "Oval", emoji: "🥚", desc: "Rosto equilibrado, testa ligeiramente mais larga que o queixo" },
  { id: "redondo", label: "Redondo", emoji: "⭕", desc: "Largura e comprimento similares, maçãs do rosto proeminentes" },
  { id: "quadrado", label: "Quadrado", emoji: "⬜", desc: "Testa, maçãs e mandíbula com largura similar" },
  { id: "coracao", label: "Coração", emoji: "🫀", desc: "Testa larga, queixo estreito e pontudo" },
  { id: "oblongo", label: "Oblongo", emoji: "📏", desc: "Rosto mais comprido que largo, similar ao oval mas mais alongado" },
]

const cortesRecomendados: Record<string, { nome: string, pct: number, desc: string }[]> = {
  oval: [
    { nome: "Fade Alto", pct: 97, desc: "Valoriza a forma natural do rosto" },
    { nome: "Degradê Médio", pct: 91, desc: "Transição suave e moderna" },
    { nome: "Undercut", pct: 88, desc: "Visual arrojado e versátil" },
    { nome: "Pompadour", pct: 81, desc: "Clássico e elegante" },
  ],
  redondo: [
    { nome: "Fade Alto", pct: 92, desc: "Alonga visualmente o rosto" },
    { nome: "Mohawk Suave", pct: 88, desc: "Adiciona altura ao rosto" },
    { nome: "Undercut com volume", pct: 84, desc: "Cria ilusão de rosto mais comprido" },
    { nome: "Franja lateral", pct: 76, desc: "Quebra a simetria circular" },
  ],
  quadrado: [
    { nome: "Degradê Médio", pct: 94, desc: "Suaviza os ângulos da mandíbula" },
    { nome: "Pompadour", pct: 89, desc: "Adiciona altura, equilibra o rosto" },
    { nome: "Lateral Liso", pct: 83, desc: "Destaca a estrutura forte" },
    { nome: "Caesar Cut", pct: 78, desc: "Franja reta que suaviza a testa" },
  ],
  coracao: [
    { nome: "Lateral texturizado", pct: 93, desc: "Adiciona volume nas laterais" },
    { nome: "Degradê Baixo", pct: 87, desc: "Equilibra testa e queixo" },
    { nome: "Franja natural", pct: 82, desc: "Reduz visualmente a testa" },
    { nome: "Bob masculino", pct: 74, desc: "Volume nas laterais inferiores" },
  ],
  oblongo: [
    { nome: "Corte com volume lateral", pct: 91, desc: "Adiciona largura ao rosto" },
    { nome: "Degradê Baixo", pct: 86, desc: "Evita alongar mais o rosto" },
    { nome: "Franja caída", pct: 83, desc: "Reduz visualmente o comprimento" },
    { nome: "César com textura", pct: 77, desc: "Equilibrado para rostos longos" },
  ],
}

export default function IABiotipoPage() {
  const [etapa, setEtapa] = useState<"upload" | "analisando" | "resultado">("upload")
  const [biotipoDetectado, setBiotipoDetectado] = useState<string | null>(null)
  const [confianca, setConfianca] = useState(0)
  const [progresso, setProgresso] = useState(0)

  function simularAnalise() {
    setEtapa("analisando")
    setProgresso(0)

    const interval = setInterval(() => {
      setProgresso((p) => {
        if (p >= 100) {
          clearInterval(interval)
          setBiotipoDetectado("oval")
          setConfianca(94)
          setEtapa("resultado")
          return 100
        }
        return p + 5
      })
    }, 100)
  }

  function resetar() {
    setEtapa("upload")
    setBiotipoDetectado(null)
    setConfianca(0)
    setProgresso(0)
  }

  const cortes = biotipoDetectado ? cortesRecomendados[biotipoDetectado] : []
  const biotipo = biotipos.find(b => b.id === biotipoDetectado)

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">IA de Biotipo Facial</h1>
          <p className="text-zinc-500 text-sm">MOD-01 · GPT-4o Vision · Análise automática do formato do rosto</p>
        </div>
        {etapa === "resultado" && (
          <button
            onClick={resetar}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors"
          >
            Nova análise
          </button>
        )}
      </div>

      {/* Etapa 1 — Upload */}
      {etapa === "upload" && (
        <div className="max-w-lg mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-white text-lg font-bold mb-2">Analisar biotipo do cliente</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              A IA analisa a foto do cliente e detecta o formato do rosto automaticamente. Com base no biotipo, o sistema sugere os cortes mais compatíveis.
            </p>

            {/* Área de upload simulada */}
            <div
              onClick={simularAnalise}
              className="border-2 border-dashed border-zinc-700 rounded-xl p-8 cursor-pointer hover:border-amber-500 hover:bg-amber-500/5 transition-all group mb-4"
            >
              <div className="text-4xl mb-3">📸</div>
              <div className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors">
                Clique para enviar foto do cliente
              </div>
              <div className="text-zinc-600 text-xs mt-1">PNG, JPG · máx 5MB · rosto visível</div>
            </div>

            <div className="text-zinc-600 text-xs">
              Ou clique na área acima para simular uma análise de demonstração
            </div>
          </div>

          {/* Como funciona */}
          <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Como funciona</div>
            <div className="space-y-2">
              {[
                { icon: "📸", texto: "Foto do cliente é enviada para a OpenAI GPT-4o Vision" },
                { icon: "🤖", texto: "A IA detecta o formato do rosto com até 97% de precisão" },
                { icon: "✂️", texto: "Sistema sugere os 4 cortes mais compatíveis com o biotipo" },
                { icon: "💾", texto: "Resultado salvo no perfil do cliente para consultas futuras" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-zinc-400 text-sm">{item.texto}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Etapa 2 — Analisando */}
      {etapa === "analisando" && (
        <div className="max-w-lg mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-6 animate-pulse">🤖</div>
            <h2 className="text-white text-lg font-bold mb-2">Analisando o biotipo...</h2>
            <p className="text-zinc-400 text-sm mb-6">GPT-4o Vision está processando a imagem</p>

            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-100"
                style={{ width: `${progresso}%` }}
              ></div>
            </div>
            <div className="text-amber-400 text-sm font-mono">{progresso}%</div>

            <div className="mt-6 space-y-2 text-left">
              {[
                { label: "Detectando pontos faciais", done: progresso > 25 },
                { label: "Calculando proporções", done: progresso > 50 },
                { label: "Identificando formato do rosto", done: progresso > 75 },
                { label: "Selecionando cortes compatíveis", done: progresso > 90 },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-green-500" : "bg-zinc-700"}`}>
                    {step.done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={`text-sm ${step.done ? "text-zinc-300" : "text-zinc-600"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Etapa 3 — Resultado */}
      {etapa === "resultado" && biotipo && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{biotipo.emoji}</div>
                <div>
                  <div className="text-xs text-purple-400 font-mono uppercase tracking-widest mb-1">Biotipo detectado</div>
                  <div className="text-white text-xl font-bold">Rosto {biotipo.label}</div>
                  <div className="text-zinc-400 text-sm mt-0.5">{confianca}% de confiança · GPT-4o Vision</div>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">{biotipo.desc}</p>

              <div className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                <div className="text-purple-400 text-xs font-mono mb-1">⬡ IA · Análise salva no perfil</div>
                <div className="text-zinc-400 text-xs">O resultado foi vinculado ao perfil do cliente e estará disponível em todos os atendimentos futuros.</div>
              </div>
            </div>

            {/* Todos os biotipos */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Compatibilidade com outros biotipos</div>
              {biotipos.map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-lg w-7">{b.emoji}</span>
                  <span className={`text-sm flex-1 ${b.id === biotipoDetectado ? "text-white font-medium" : "text-zinc-400"}`}>
                    {b.label}
                  </span>
                  {b.id === biotipoDetectado && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Detectado ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-4">
                ✂️ Cortes recomendados para rosto {biotipo.label}
              </div>
              <div className="space-y-3">
                {cortes.map((corte, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${i === 0 ? "bg-amber-500/10 border-amber-500/25" : "bg-zinc-800 border-zinc-700"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${i === 0 ? "text-amber-400" : "text-white"}`}>
                        {i === 0 && "⭐ "}{corte.nome}
                      </span>
                      <span className={`text-xs font-mono font-bold ${i === 0 ? "text-amber-400" : "text-zinc-400"}`}>
                        {corte.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${i === 0 ? "bg-amber-500" : "bg-zinc-500"}`}
                        style={{ width: `${corte.pct}%` }}
                      ></div>
                    </div>
                    <div className="text-zinc-500 text-xs">{corte.desc}</div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                Salvar no perfil do cliente
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}