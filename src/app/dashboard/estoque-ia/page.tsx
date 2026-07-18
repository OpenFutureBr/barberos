"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import CardCarousel from "@/components/ui/CardCarousel"

type Previsao = {
  id: string
  produto: string
  sku: string
  estoque: number
  minimo: number
  vendaSemana: number
  diasRuptura: number
  sugestao: number
  tendencia: "alta" | "queda" | "estavel"
  urgencia: "CRITICA" | "ATENCAO" | "OK"
}

const urgenciaConfig: Record<string, { label: string; style: string; barColor: string }> = {
  CRITICA: { label: "⚠ Crítico", style: "bg-red-500/10 text-red-400 border border-red-500/20", barColor: "bg-red-500" },
  ATENCAO: { label: "Atenção", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20", barColor: "bg-amber-500" },
  OK: { label: "OK", style: "bg-green-500/10 text-green-400 border border-green-500/20", barColor: "bg-green-500" },
}

const tendenciaIcon: Record<string, string> = { alta: "↑", queda: "↓", estavel: "→" }
const tendenciaColor: Record<string, string> = { alta: "text-green-400", queda: "text-red-400", estavel: "text-zinc-400" }

export default function EstoqueIAPage() {
  const [previsoes, setPrevisoes] = useState<Previsao[]>([])
  const [insight, setInsight] = useState("")
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [pedidoAberto, setPedidoAberto] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/ia/estoque")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro(d.error); return }
        setPrevisoes(d.previsoes ?? [])
        setInsight(d.insight ?? "")
      })
      .catch(e => setErro(String(e)))
      .finally(() => setLoading(false))
  }, [])

  function togglePedido(id: string) {
    setPedidoAberto(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const criticos = previsoes.filter(p => p.urgencia === "CRITICA").length
  const atencao = previsoes.filter(p => p.urgencia === "ATENCAO").length
  const totalPedido = previsoes.filter(p => pedidoAberto.includes(p.id)).reduce((s, p) => s + p.sugestao, 0)
  const visiveis = previsoes.filter(p => p.urgencia !== "OK" || p.sugestao > 0 || previsoes.length <= 10)

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">⬡ IA — Previsão de Estoque</h1>
          <p className="text-zinc-500 text-sm">Análise preditiva automática · Sugestões de reposição</p>
        </div>
        {pedidoAberto.length > 0 && (
          <button
            onClick={() => alert(`Pedido:\n\n${previsoes.filter(p => pedidoAberto.includes(p.id)).map(p => `• ${p.produto}: ${p.sugestao} un`).join("\n")}\n\nTotal: ${totalPedido} unidades`)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            📦 Fazer pedido ({pedidoAberto.length} itens)
          </button>
        )}
      </div>

      {/* KPIs — carrossel no mobile, grid no desktop (mesmo padrão do Dashboard) */}
      {(() => {
        const kpis = [
          <div key="critico" className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 h-full">
            <div className="text-red-400 text-xs font-mono uppercase tracking-widest mb-1">Ruptura iminente</div>
            <div className="text-red-400 text-3xl font-bold">{criticos}</div>
            <div className="text-zinc-500 text-xs mt-1">produtos em situação crítica</div>
          </div>,
          <div key="atencao" className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 h-full">
            <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-1">Atenção</div>
            <div className="text-amber-400 text-3xl font-bold">{atencao}</div>
            <div className="text-zinc-500 text-xs mt-1">produtos com estoque baixo</div>
          </div>,
          <div key="selecionados" className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 h-full">
            <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-1">Itens selecionados</div>
            <div className="text-purple-400 text-3xl font-bold">{pedidoAberto.length}</div>
            <div className="text-zinc-500 text-xs mt-1">
              {pedidoAberto.length > 0 ? `${totalPedido} unidades no pedido` : "selecione para pedir"}
            </div>
          </div>,
        ]
        return (
          <div className="mb-4">
            <CardCarousel cards={kpis} />
            <div className="hidden md:grid md:grid-cols-3 gap-3">{kpis}</div>
          </div>
        )
      })()}

      {/* Insight IA */}
      {(loading || insight) && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 mb-4">
          <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-2">⬡ Análise da IA</div>
          {loading
            ? <div className="text-zinc-500 text-sm animate-pulse">Analisando estoque com IA...</div>
            : <div className="text-zinc-300 text-sm leading-relaxed">{insight}</div>}
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-red-400 text-sm">{erro}</div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <div className="text-zinc-500 text-sm">Nenhum produto com alerta de estoque. Tudo certo! ✓</div>
        </div>
      ) : (
        <div className="space-y-3">
          {visiveis.map(produto => {
            const config = urgenciaConfig[produto.urgencia]
            const selecionado = pedidoAberto.includes(produto.id)
            const pctEstoque = Math.min(100, Math.round((produto.estoque / Math.max(produto.minimo * 2, 1)) * 100))

            return (
              <div key={produto.id}
                className={`bg-zinc-900 border rounded-xl p-4 transition-all ${
                  produto.urgencia === "CRITICA" ? "border-red-500/25 bg-red-500/[0.03]"
                  : selecionado ? "border-amber-500/25"
                  : "border-zinc-800 hover:border-zinc-700"
                }`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{produto.produto}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.style}`}>{config.label}</span>
                      <span className={`text-xs font-bold ${tendenciaColor[produto.tendencia]}`}>
                        {tendenciaIcon[produto.tendencia]} {produto.tendencia}
                      </span>
                    </div>
                    {produto.sku && <div className="text-zinc-600 text-xs mb-3">{produto.sku}</div>}

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Estoque atual</span>
                          <span className={produto.estoque <= produto.minimo ? "text-red-400 font-medium" : "text-zinc-300"}>
                            {produto.estoque} un
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${config.barColor}`} style={{ width: `${pctEstoque}%` }} />
                        </div>
                      </div>
                      <div className="text-center w-20">
                        <div className="text-zinc-500 text-xs">Mínimo</div>
                        <div className="text-zinc-300 text-sm font-medium">{produto.minimo} un</div>
                      </div>
                      <div className="text-center w-24">
                        <div className="text-zinc-500 text-xs">Venda/semana</div>
                        <div className="text-zinc-300 text-sm font-medium">{produto.vendaSemana} un</div>
                      </div>
                      <div className="text-center w-24">
                        <div className="text-zinc-500 text-xs">Ruptura em</div>
                        <div className={`text-sm font-bold ${produto.diasRuptura <= 7 ? "text-red-400" : "text-zinc-300"}`}>
                          {produto.diasRuptura >= 999 ? "—" : `~${produto.diasRuptura}d`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {produto.sugestao > 0 && (
                    <div className="flex-shrink-0 text-center">
                      <div className="text-zinc-500 text-xs mb-1">IA sugere</div>
                      <div className="text-amber-400 font-bold text-lg mb-2">{produto.sugestao} un</div>
                      <button onClick={() => togglePedido(produto.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          selecionado
                            ? "bg-amber-500 text-black border-amber-500"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                        }`}>
                        {selecionado ? "✓ Selecionado" : "Pedir"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
