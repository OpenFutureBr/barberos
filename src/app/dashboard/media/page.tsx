"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const contentSlots = [
  { id: "1", tipo: "FILA", titulo: "Fila de espera", descricao: "Exibe a fila em tempo real no painel TV", ativo: true, prioridade: 1 },
  { id: "2", tipo: "PROMOCAO_PROPRIA", titulo: "Promoções da barbearia", descricao: "Cashback, clube de assinatura, gift cards", ativo: true, prioridade: 2 },
  { id: "3", tipo: "ANUNCIO_EXTERNO", titulo: "BarberOS Media — Anúncio externo", descricao: "Espaço reservado para futura rede de mídia local", ativo: false, prioridade: 3 },
]

const tipoStyle: Record<string, string> = {
  FILA: "bg-green-500/10 text-green-400 border border-green-500/20",
  PROMOCAO_PROPRIA: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  ANUNCIO_EXTERNO: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
}

export default function MediaPage() {
  const [slots, setSlots] = useState(contentSlots)
  const [aba, setAba] = useState<"slots" | "media">("slots")

  function toggleSlot(id: string) {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ativo: !s.ativo } : s))
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">BarberOS Media</h1>
          <p className="text-zinc-500 text-sm">Painel TV · content_slots[] · Preparação para rede de mídia</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
          Fase 4 · Pós-lançamento
        </span>
      </div>

      {/* Arquitetura content_slots */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5 mb-4">
        <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-2">
          ⬡ Decisão de arquitetura — PRD v1.2
        </div>
        <div className="text-zinc-300 text-sm leading-relaxed mb-3">
          O Painel TV foi construído como um <strong className="text-purple-400">renderer de conteúdo</strong> com
          suporte a <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-purple-400 font-mono">content_slots[]</code>.
          Isso permite adicionar anúncios externos no futuro sem reescrever o componente.
        </div>
        <div className="bg-zinc-900 rounded-lg p-3 font-mono text-xs text-zinc-300">
          <div className="text-zinc-500 mb-1">{"// Estrutura do content_slots[]"}</div>
          <div><span className="text-blue-400">type</span> <span className="text-green-400">ContentSlot</span> {"= {"}</div>
          <div className="ml-4"><span className="text-amber-400">tipo</span>: <span className="text-green-400">"FILA"</span> | <span className="text-green-400">"PROMOCAO_PROPRIA"</span> | <span className="text-green-400">"ANUNCIO_EXTERNO"</span></div>
          <div className="ml-4"><span className="text-amber-400">prioridade</span>: <span className="text-blue-400">number</span></div>
          <div className="ml-4"><span className="text-amber-400">ativo</span>: <span className="text-blue-400">boolean</span></div>
          <div className="ml-4"><span className="text-amber-400">conteudo</span>: <span className="text-blue-400">string</span> | <span className="text-blue-400">ComponentType</span></div>
          <div>{"}"}</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "slots", label: "📺 Content Slots" },
          { id: "media", label: "💡 BarberOS Media" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aba Content Slots */}
      {aba === "slots" && (
        <div>
          <div className="space-y-3 mb-4">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={`bg-zinc-900 border rounded-xl p-4 transition-all ${slot.ativo ? "border-zinc-700" : "border-zinc-800 opacity-60"}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold font-mono text-sm flex-shrink-0">
                    {slot.prioridade}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{slot.titulo}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tipoStyle[slot.tipo]}`}>
                        {slot.tipo}
                      </span>
                    </div>
                    <div className="text-zinc-500 text-xs">{slot.descricao}</div>
                  </div>
                  <div
                    onClick={() => toggleSlot(slot.id)}
                    className={`w-10 h-6 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${
                      slot.ativo ? "bg-green-500" : "bg-zinc-700"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${slot.ativo ? "left-5" : "left-1"}`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview Painel TV */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">
              Preview — Painel TV (ordem de exibição)
            </div>
            <div className="flex gap-2">
              {slots.filter(s => s.ativo).sort((a, b) => a.prioridade - b.prioridade).map((slot) => (
                <div
                  key={slot.id}
                  className={`flex-1 rounded-lg p-3 text-center border ${tipoStyle[slot.tipo]}`}
                >
                  <div className="text-xs font-medium">{slot.titulo}</div>
                  <div className="text-xs opacity-60 mt-0.5">{slot.prioridade}º slot</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Aba BarberOS Media */}
      {aba === "media" && (
        <div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-4">
            <div className="bg-zinc-800 p-5">
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Produto futuro · Pós Fase 4</div>
              <div className="text-white text-2xl font-bold mb-2">
                BarberOS <span className="text-zinc-500 font-light">Media</span>
              </div>
              <div className="text-zinc-400 text-sm leading-relaxed">
                Rede de mídia local segmentada — anúncios de patrocinadores exibidos na tela de fila de espera das barbearias parceiras, com revenue share automático para os estabelecimentos.
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-zinc-800 rounded-xl p-4 border-l-4 border-green-500">
                  <div className="text-green-400 text-xs font-mono uppercase mb-2">Por que faz sentido</div>
                  <div className="text-zinc-400 text-sm">Audiência extremamente qualificada: homens 18-45 anos, geolocalização precisa, renda estimada pelo ticket médio.</div>
                </div>
                <div className="bg-zinc-800 rounded-xl p-4 border-l-4 border-amber-500">
                  <div className="text-amber-400 text-xs font-mono uppercase mb-2">Por que aguardar</div>
                  <div className="text-zinc-400 text-sm">Requer plataforma de campanhas, sistema de aprovação, revenue share e escala mínima de 500+ estabelecimentos.</div>
                </div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                <div className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-3">Modelo de receita</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <div className="text-3xl font-bold text-green-400">60%</div>
                    <div className="text-zinc-500 text-sm mt-1">para o estabelecimento</div>
                  </div>
                  <div className="text-zinc-600 text-2xl">+</div>
                  <div className="flex-1 text-center">
                    <div className="text-3xl font-bold text-blue-400">40%</div>
                    <div className="text-zinc-500 text-sm mt-1">para o BarberOS</div>
                  </div>
                </div>
              </div>

              {/* Tasks futuras */}
              <div className="space-y-2">
                <div className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Tarefas preparatórias registradas</div>
                {[
                  { id: "T-F01", texto: "Painel TV com content_slots[] — FILA, PROMOCAO_PROPRIA, ANUNCIO_EXTERNO" },
                  { id: "T-F02", texto: "Pesquisar modelo de revenue share — benchmark Waze Ads, Spotify Podcasters" },
                  { id: "T-F03", texto: "Mapear segmentação de audiência por tipo de estabelecimento" },
                  { id: "T-F04", texto: "Definir política de curadoria de anunciantes e critérios de qualidade" },
                ].map((t) => (
                  <div key={t.id} className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg">
                    <span className="text-purple-400 font-mono text-xs font-bold flex-shrink-0 mt-0.5">{t.id}</span>
                    <span className="text-zinc-400 text-sm">{t.texto}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}