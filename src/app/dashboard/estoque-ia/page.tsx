"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const previsoesMock = [
  {
    id: "1",
    produto: "Óleo para Barba Don Alcides",
    sku: "DA-OB-30ML",
    estoque: 2,
    minimo: 5,
    vendaSemana: 3,
    diasRuptura: 4,
    sugestao: 10,
    tendencia: "alta",
    urgencia: "CRITICA",
  },
  {
    id: "2",
    produto: "Cera Modeladora Layrite",
    sku: "LY-CM-113G",
    estoque: 1,
    minimo: 3,
    vendaSemana: 2,
    diasRuptura: 3,
    sugestao: 8,
    tendencia: "estavel",
    urgencia: "CRITICA",
  },
  {
    id: "3",
    produto: "Pomada Matte American Crew",
    sku: "AC-PM-85G",
    estoque: 8,
    minimo: 5,
    vendaSemana: 3,
    diasRuptura: 18,
    sugestao: 6,
    tendencia: "alta",
    urgencia: "ATENCAO",
  },
  {
    id: "4",
    produto: "Loção Pós-Barba Barbearia Clube",
    sku: "BC-LB-200ML",
    estoque: 6,
    minimo: 3,
    vendaSemana: 2,
    diasRuptura: 21,
    sugestao: 4,
    tendencia: "estavel",
    urgencia: "OK",
  },
  {
    id: "5",
    produto: "Shampoo Anticaspa H&S",
    sku: "HS-AC-400ML",
    estoque: 12,
    minimo: 4,
    vendaSemana: 2,
    diasRuptura: 42,
    sugestao: 0,
    tendencia: "queda",
    urgencia: "OK",
  },
  {
    id: "6",
    produto: "Gel Fix Forte Barba de Respeito",
    sku: "BR-GF-250G",
    estoque: 15,
    minimo: 5,
    vendaSemana: 3,
    diasRuptura: 35,
    sugestao: 0,
    tendencia: "estavel",
    urgencia: "OK",
  },
]

const urgenciaConfig: Record<string, { label: string, style: string, barColor: string }> = {
  CRITICA: { label: "⚠ Crítico", style: "bg-red-500/10 text-red-400 border border-red-500/20", barColor: "bg-red-500" },
  ATENCAO: { label: "Atenção", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20", barColor: "bg-amber-500" },
  OK: { label: "OK", style: "bg-green-500/10 text-green-400 border border-green-500/20", barColor: "bg-green-500" },
}

const tendenciaIcon: Record<string, string> = {
  alta: "↑",
  queda: "↓",
  estavel: "→",
}

const tendenciaColor: Record<string, string> = {
  alta: "text-green-400",
  queda: "text-red-400",
  estavel: "text-zinc-400",
}

export default function EstoqueIAPage() {
  const [pedidoAberto, setPedidoAberto] = useState<string[]>([])

  function togglePedido(id: string) {
    setPedidoAberto(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const criticos = previsoesMock.filter(p => p.urgencia === "CRITICA").length
  const atencao = previsoesMock.filter(p => p.urgencia === "ATENCAO").length
  const totalPedido = previsoesMock
    .filter(p => pedidoAberto.includes(p.id))
    .reduce((s, p) => s + p.sugestao, 0)

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">⬡ IA — Previsão de Estoque</h1>
          <p className="text-zinc-500 text-sm">Análise preditiva automática · Sugestões de reposição</p>
        </div>
       {pedidoAberto.length > 0 && (
          <button
            onClick={() => alert(`Pedido enviado!\n\n${previsoesMock.filter(p => pedidoAberto.includes(p.id)).map(p => `• ${p.produto}: ${p.sugestao} un`).join("\n")}\n\nTotal: ${totalPedido} unidades`)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            📦 Fazer pedido ({pedidoAberto.length} itens)
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="text-red-400 text-xs font-mono uppercase tracking-widest mb-1">Ruptura iminente</div>
          <div className="text-red-400 text-3xl font-bold">{criticos}</div>
          <div className="text-zinc-500 text-xs mt-1">produtos em situação crítica</div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-1">Atenção</div>
          <div className="text-amber-400 text-3xl font-bold">{atencao}</div>
          <div className="text-zinc-500 text-xs mt-1">produtos com estoque baixo</div>
        </div>
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-1">Itens selecionados</div>
          <div className="text-purple-400 text-3xl font-bold">{pedidoAberto.length}</div>
          <div className="text-zinc-500 text-xs mt-1">
            {pedidoAberto.length > 0 ? `${totalPedido} unidades no pedido` : "selecione para pedir"}
          </div>
        </div>
      </div>

      {/* Insight IA */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 mb-4">
        <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-2">⬡ Análise da IA</div>
        <div className="text-zinc-300 text-sm leading-relaxed">
          Com base no histórico de vendas, <strong>Óleo para Barba</strong> e <strong>Cera Layrite</strong> atingirão ruptura em menos de 4 dias.
          A demanda por produtos de barba aumentou <strong>23%</strong> este mês.
          Recomendo fazer o pedido hoje para evitar perda de vendas no final de semana.
        </div>
      </div>

      {/* Lista de produtos */}
      <div className="space-y-3">
        {previsoesMock.map((produto) => {
          const config = urgenciaConfig[produto.urgencia]
          const selecionado = pedidoAberto.includes(produto.id)
          const pctEstoque = Math.min(100, (produto.estoque / (produto.minimo * 2)) * 100)

          return (
            <div
              key={produto.id}
              className={`bg-zinc-900 border rounded-xl p-4 transition-all ${
                produto.urgencia === "CRITICA"
                  ? "border-red-500/25 bg-red-500/3"
                  : selecionado
                  ? "border-amber-500/25"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start gap-4">

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium">{produto.produto}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.style}`}>
                      {config.label}
                    </span>
                    <span className={`text-xs font-bold ${tendenciaColor[produto.tendencia]}`}>
                      {tendenciaIcon[produto.tendencia]} {produto.tendencia}
                    </span>
                  </div>
                  <div className="text-zinc-600 text-xs mb-3">{produto.sku}</div>

                  {/* Barra de estoque */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-500">Estoque atual</span>
                        <span className={produto.estoque <= produto.minimo ? "text-red-400" : "text-zinc-300"}>
                          {produto.estoque} un
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${config.barColor}`}
                          style={{ width: `${pctEstoque}%` }}
                        ></div>
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
                        ~{produto.diasRuptura} dias
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ação */}
                {produto.sugestao > 0 && (
                  <div className="flex-shrink-0 text-center">
                    <div className="text-zinc-500 text-xs mb-1">IA sugere</div>
                    <div className="text-amber-400 font-bold text-lg mb-2">{produto.sugestao} un</div>
                    <button
                      onClick={() => togglePedido(produto.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selecionado
                          ? "bg-amber-500 text-black border-amber-500"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                      }`}
                    >
                      {selecionado ? "✓ Selecionado" : "Pedir"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </DashboardLayout>
  )
}