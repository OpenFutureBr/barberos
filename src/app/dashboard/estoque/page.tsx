"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const produtosMock = [
  { id: "1", nome: "Pomada Matte American Crew", sku: "AC-PM-85G", estoque: 8, minimo: 5, preco: 48, custo: 28, fornecedor: "Distribarbearia", categoria: "Finalizador" },
  { id: "2", nome: "Óleo para Barba Don Alcides", sku: "DA-OB-30ML", estoque: 2, minimo: 5, preco: 35, custo: 18, fornecedor: "Distribarbearia", categoria: "Barba" },
  { id: "3", nome: "Shampoo Anticaspa H&S", sku: "HS-AC-400ML", estoque: 12, minimo: 4, preco: 32, custo: 16, fornecedor: "Farmabase", categoria: "Shampoo" },
  { id: "4", nome: "Cera Modeladora Layrite", sku: "LY-CM-113G", estoque: 1, minimo: 3, preco: 55, custo: 32, fornecedor: "Distribarbearia", categoria: "Finalizador" },
  { id: "5", nome: "Gel Fix Forte Barba de Respeito", sku: "BR-GF-250G", estoque: 15, minimo: 5, preco: 29, custo: 14, fornecedor: "Distribarbearia", categoria: "Finalizador" },
  { id: "6", nome: "Loção Pós-Barba Barbearia Clube", sku: "BC-LB-200ML", estoque: 6, minimo: 3, preco: 42, custo: 22, fornecedor: "Farmabase", categoria: "Barba" },
]

const vendaMock = [
  { id: "1", produto: "Pomada Matte American Crew", cliente: "Felipe Gomes", qtd: 1, total: 48, hora: "14:32" },
  { id: "2", produto: "Óleo para Barba Don Alcides", cliente: "Pedro Silva", qtd: 1, total: 35, hora: "13:15" },
  { id: "3", produto: "Cera Modeladora Layrite", cliente: "Carlos Souza", qtd: 2, total: 110, hora: "11:40" },
]

function getStatus(estoque: number, minimo: number) {
  if (estoque === 0) return { label: "Sem estoque", style: "bg-red-500/10 text-red-400 border border-red-500/20" }
  if (estoque <= minimo) return { label: "⚠ Crítico", style: "bg-red-500/10 text-red-400 border border-red-500/20" }
  if (estoque <= minimo * 1.5) return { label: "Baixo", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20" }
  return { label: "OK", style: "bg-green-500/10 text-green-400 border border-green-500/20" }
}

export default function EstoquePage() {
  const [aba, setAba] = useState<"estoque" | "pdv" | "movimentos">("estoque")
  const [busca, setBusca] = useState("")
  const [modalNovo, setModalNovo] = useState(false)
  const [modalVenda, setModalVenda] = useState(false)
  const [produtoSel, setProdutoSel] = useState<typeof produtosMock[0] | null>(null)
  const [qtdVenda, setQtdVenda] = useState("1")
  const [clienteVenda, setClienteVenda] = useState("")

  const produtosFiltrados = produtosMock.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.sku.toLowerCase().includes(busca.toLowerCase())
  )

  const criticos = produtosMock.filter(p => p.estoque <= p.minimo).length
  const totalEstoque = produtosMock.reduce((s, p) => s + (p.estoque * p.custo), 0)
  const totalVendasHoje = vendaMock.reduce((s, v) => s + v.total, 0)

  function handleVenda(e: React.FormEvent) {
    e.preventDefault()
    setModalVenda(false)
    setProdutoSel(null)
    setQtdVenda("1")
    setClienteVenda("")
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Estoque & PDV</h1>
          <p className="text-zinc-500 text-sm">{produtosMock.length} produtos · {criticos} itens críticos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalVenda(true)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm border border-green-500/20 transition-colors">
            💳 Vender produto
          </button>
          <button onClick={() => setModalNovo(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            + Novo produto
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-blue-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Valor em estoque</div>
          <div className="text-blue-400 text-xl font-bold">R$ {totalEstoque.toFixed(2)}</div>
          <div className="text-zinc-600 text-xs mt-1">{produtosMock.length} produtos cadastrados</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-red-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Itens críticos</div>
          <div className="text-red-400 text-xl font-bold">{criticos}</div>
          <div className="text-zinc-600 text-xs mt-1">abaixo do estoque mínimo</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-green-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Vendas hoje (PDV)</div>
          <div className="text-green-400 text-xl font-bold">R$ {totalVendasHoje.toFixed(2)}</div>
          <div className="text-zinc-600 text-xs mt-1">{vendaMock.length} produtos vendidos</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "estoque", label: "📦 Estoque" },
          { id: "pdv", label: "💳 PDV — Vendas" },
          { id: "movimentos", label: "📋 Movimentos" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aba Estoque */}
      {aba === "estoque" && (
        <div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto ou SKU..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600 mb-3"
          />

          {/* Alerta IA */}
          {criticos > 0 && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 mb-3 flex items-start gap-3">
              <span className="text-purple-400 text-base">⬡</span>
              <div>
                <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-1">IA detectou {criticos} itens críticos</div>
                <div className="text-zinc-400 text-sm">Óleo para Barba: ruptura em ~4 dias · Cera Layrite: ruptura em ~3 dias. Sugestão: fazer pedido hoje.</div>
              </div>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Produto</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Estoque</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Mínimo</th>
                  <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Preço venda</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((p, i) => {
                  const status = getStatus(p.estoque, p.minimo)
                  return (
                    <tr key={p.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors ${i === produtosFiltrados.length - 1 ? "border-0" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-medium">{p.nome}</div>
                        <div className="text-zinc-600 text-xs">{p.sku}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-sm font-bold ${p.estoque <= p.minimo ? "text-red-400" : "text-white"}`}>{p.estoque}</div>
                        <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full ${p.estoque <= p.minimo ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(100, (p.estoque / (p.minimo * 2)) * 100)}%` }}></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-sm">{p.minimo}</td>
                      <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">R$ {p.preco}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.style}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setProdutoSel(p); setModalVenda(true) }}
                          className="text-zinc-600 hover:text-green-400 text-xs transition-colors"
                        >
                          Vender →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba PDV */}
      {aba === "pdv" && (
        <div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Vendas do dia</span>
              <span className="text-green-400 text-sm font-bold">Total: R$ {totalVendasHoje.toFixed(2)}</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Produto</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Hora</th>
                  <th className="text-center px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Qtd</th>
                  <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {vendaMock.map((v, i) => (
                  <tr key={v.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === vendaMock.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3 text-white text-sm">{v.produto}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{v.cliente}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{v.hora}</td>
                    <td className="px-4 py-3 text-center text-zinc-300 text-sm">{v.qtd}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-bold font-mono">R$ {v.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba Movimentos */}
      {aba === "movimentos" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-white font-medium mb-1">Histórico de movimentos</div>
          <div className="text-zinc-500 text-sm">Entradas, saídas e ajustes de estoque aparecerão aqui</div>
        </div>
      )}

      {/* Modal novo produto */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Produto</h2>
              <button onClick={() => setModalNovo(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome do produto *</label>
                <input placeholder="Ex: Pomada Matte American Crew" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço de custo</label>
                  <input type="number" placeholder="28.00" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço de venda</label>
                  <input type="number" placeholder="48.00" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Estoque inicial</label>
                  <input type="number" placeholder="10" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Estoque mínimo</label>
                  <input type="number" placeholder="5" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalNovo(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button onClick={() => setModalNovo(false)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">Cadastrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal venda */}
      {modalVenda && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Vender Produto</h2>
              <button onClick={() => setModalVenda(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleVenda} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Produto</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                  {produtosMock.map(p => (
                    <option key={p.id} selected={produtoSel?.id === p.id}>{p.nome} — R$ {p.preco}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Cliente</label>
                <input value={clienteVenda} onChange={(e) => setClienteVenda(e.target.value)} placeholder="Nome do cliente" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Quantidade</label>
                <input value={qtdVenda} onChange={(e) => setQtdVenda(e.target.value)} type="number" min="1" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
              </div>
              {produtoSel && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="text-green-400 text-sm font-bold">Total: R$ {(produtoSel.preco * parseInt(qtdVenda || "1")).toFixed(2)}</div>
                  <div className="text-zinc-500 text-xs mt-0.5">Gera cobrança PIX automaticamente</div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalVenda(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-green-500/20 transition-colors">Registrar venda</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}