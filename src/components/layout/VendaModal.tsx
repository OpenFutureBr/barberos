"use client"

import { useState, useEffect } from "react"

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

export type CartItem = { produto: any; qty: number; unitPrice: number }

type Props = {
  aberto: boolean
  onFechar: () => void
  itens: CartItem[]
  setItens: (fn: (prev: CartItem[]) => CartItem[]) => void
}

function getHojeISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

export default function VendaModal({ aberto, onFechar, itens, setItens }: Props) {
  const [produtos, setProdutos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [clientesHojeIds, setClientesHojeIds] = useState<Set<string>>(new Set())
  const [buscaCliente, setBuscaCliente] = useState("")
  const [clienteVenda, setClienteVenda] = useState("")
  const [dropdownCliente, setDropdownCliente] = useState(false)
  const [buscaProduto, setBuscaProduto] = useState("")
  const [dropdownProduto, setDropdownProduto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    const hoje = getHojeISO()
    Promise.all([
      fetch("/api/estoque").then(r => r.json()),
      fetch("/api/clientes").then(r => r.json()),
      fetch(`/api/agendamentos?data=${hoje}`).then(r => r.json()),
    ]).then(([prods, cls, appts]) => {
      setProdutos(Array.isArray(prods) ? prods : [])
      setClientes(Array.isArray(cls) ? cls : [])
      if (Array.isArray(appts)) {
        setClientesHojeIds(new Set(appts.map((a: any) => a.clientId).filter(Boolean)))
      }
    }).catch(console.error)
  }, [aberto])

  // Estoque disponível descontando o que já está no carrinho
  function stockDisponivel(produtoId: string, stockAtual: number) {
    const noCarrinho = itens.find(i => i.produto.id === produtoId)?.qty || 0
    return stockAtual - noCarrinho
  }

  function adicionar(produto: any) {
    const disponivel = stockDisponivel(produto.id, produto.stock)
    if (disponivel <= 0) return
    setItens(prev => {
      const idx = prev.findIndex(i => i.produto.id === produto.id)
      if (idx >= 0) {
        const n = [...prev]
        n[idx] = { ...n[idx], qty: Math.min(n[idx].qty + 1, produto.stock) }
        return n
      }
      return [...prev, { produto, qty: 1, unitPrice: produto.salePrice }]
    })
    setBuscaProduto(""); setDropdownProduto(false)
  }

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!itens.length) return
    setSalvando(true)
    try {
      for (const item of itens) {
        const res = await fetch("/api/estoque/movimentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.produto.id,
            type: "SAIDA",
            quantity: item.qty,
            reason: clienteVenda ? `Venda — ${clienteVenda}` : "Venda balcão",
            unitPrice: item.unitPrice,
          }),
        })
        if (!res.ok) { const d = await res.json(); alert(`${item.produto.name}: ${d.error}`); return }
      }
      window.dispatchEvent(new CustomEvent("vendaRegistrada"))
      setItens(() => [])
      setBuscaCliente(""); setClienteVenda("")
      onFechar()
    } catch (err) { alert(String(err)) }
    finally { setSalvando(false) }
  }

  function limparCarrinho() {
    if (itens.length > 0 && !confirm("Limpar o carrinho?")) return
    setItens(() => [])
    setBuscaCliente(""); setClienteVenda("")
  }

  if (!aberto) return null

  const total = itens.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const totalItens = itens.reduce((s, i) => s + i.qty, 0)

  // Clientes visíveis: sem busca → só quem tem agendamento hoje; com busca → todos
  const clientesVisiveis = buscaCliente.length > 0
    ? clientes.filter(c =>
        c.name.toLowerCase().includes(buscaCliente.toLowerCase()) ||
        c.phone?.includes(buscaCliente)
      ).slice(0, 8)
    : clientes.filter(c => clientesHojeIds.has(c.id)).slice(0, 8)

  // Produtos visíveis no dropdown
  const produtosVisiveis = produtos.filter(p =>
    p.isActive &&
    stockDisponivel(p.id, p.stock) > 0 &&
    (buscaProduto.length === 0 || p.name.toLowerCase().includes(buscaProduto.toLowerCase()))
  ).slice(0, 6)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div>
            <h2 className="text-white font-bold">Venda</h2>
            {itens.length > 0 && (
              <p className="text-zinc-500 text-xs mt-0.5">
                Comanda aberta · {totalItens} {totalItens === 1 ? "item" : "itens"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {itens.length > 0 && (
              <button type="button" onClick={limparCarrinho}
                className="text-zinc-600 hover:text-red-400 text-xs transition-colors">
                Limpar
              </button>
            )}
            <button onClick={onFechar} className="text-zinc-500 hover:text-white text-xl">✕</button>
          </div>
        </div>

        <form onSubmit={handleSalvar} className="p-5 space-y-4">

          {/* Cliente */}
          <div className="relative">
            <label className="text-zinc-400 text-xs mb-1 block">
              Cliente
              {buscaCliente.length === 0 && clientesHojeIds.size > 0 && (
                <span className="ml-1 text-amber-500/70">· agendados hoje</span>
              )}
            </label>
            <input value={buscaCliente}
              onChange={(e) => { setBuscaCliente(e.target.value); setClienteVenda(e.target.value); setDropdownCliente(true) }}
              onFocus={() => setDropdownCliente(true)}
              onBlur={() => setTimeout(() => setDropdownCliente(false), 150)}
              onKeyDown={(e) => { if (e.key === "Escape") setDropdownCliente(false) }}
              placeholder={clientesHojeIds.size > 0 ? "Buscar ou selecionar cliente de hoje..." : "Buscar ou digitar nome..."}
              className={inputCls} />

            {dropdownCliente && clientesVisiveis.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                {buscaCliente.length === 0 && (
                  <div className="px-3 py-1.5 text-zinc-600 text-xs border-b border-zinc-700">
                    Agendados hoje
                  </div>
                )}
                {clientesVisiveis.map(c => (
                  <button key={c.id} type="button"
                    onMouseDown={() => { setBuscaCliente(c.name); setClienteVenda(c.name); setDropdownCliente(false) }}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700 last:border-0 transition-colors">
                    <div className="text-white text-sm">{c.name}</div>
                    <div className="text-zinc-500 text-xs">{c.phone}</div>
                  </button>
                ))}
                {buscaCliente.length > 0 && clientesVisiveis.length === 0 && (
                  <div className="px-3 py-2 text-zinc-500 text-sm">Nenhum cliente encontrado</div>
                )}
              </div>
            )}
          </div>

          {/* Busca produto */}
          <div className="relative">
            <label className="text-zinc-400 text-xs mb-1 block">Adicionar produto ao carrinho</label>
            <input value={buscaProduto}
              onChange={(e) => { setBuscaProduto(e.target.value); setDropdownProduto(true) }}
              onFocus={() => setDropdownProduto(true)}
              onBlur={() => setTimeout(() => setDropdownProduto(false), 150)}
              placeholder="Digite para buscar ou veja todos..."
              className={inputCls} />

            {dropdownProduto && (
              produtosVisiveis.length > 0 ? (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                  {produtosVisiveis.map(p => {
                    const disp = stockDisponivel(p.id, p.stock)
                    return (
                      <button key={p.id} type="button" onMouseDown={() => adicionar(p)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700 last:border-0 transition-colors">
                        <div className="flex justify-between">
                          <span className="text-white text-sm">{p.name}</span>
                          <span className="text-amber-400 text-sm font-mono">R$ {p.salePrice?.toFixed(2)}</span>
                        </div>
                        <div className="text-zinc-500 text-xs">
                          Estoque disponível: <span className={disp <= 3 ? "text-red-400" : "text-zinc-400"}>{disp}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-500 text-sm shadow-xl">
                  {buscaProduto.length > 0 ? "Nenhum produto encontrado" : "Sem estoque disponível"}
                </div>
              )
            )}
          </div>

          {/* Carrinho */}
          {itens.length > 0 && (
            <div className="space-y-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Carrinho</p>
              {itens.map((item, idx) => {
                const descPct = item.unitPrice < item.produto.salePrice
                  ? ((1 - item.unitPrice / item.produto.salePrice) * 100).toFixed(0)
                  : null
                return (
                  <div key={idx} className="bg-zinc-800 rounded-lg p-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{item.produto.name}</div>
                      {descPct && <div className="text-orange-400 text-xs">{descPct}% de desconto</div>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-zinc-500 text-xs">Qtd</span>
                      <input type="number" min="1" max={item.produto.stock} value={item.qty}
                        onChange={(e) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, qty: Math.min(Math.max(1, parseInt(e.target.value) || 1), it.produto.stock) } : it))}
                        className="w-14 bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm outline-none text-center" />
                      <span className="text-zinc-500 text-xs">R$</span>
                      <input type="number" min="0" step="0.01" value={item.unitPrice}
                        onChange={(e) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: parseFloat(e.target.value) || 0 } : it))}
                        className="w-20 bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm outline-none" />
                      <button type="button" onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                        className="text-zinc-600 hover:text-red-400 transition-colors ml-1">✕</button>
                    </div>
                  </div>
                )
              })}

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="text-zinc-400 text-sm">Total</div>
                  <div className="text-zinc-600 text-xs">{totalItens} {totalItens === 1 ? "item" : "itens"}</div>
                </div>
                <span className="text-green-400 font-bold text-xl">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {itens.length === 0 && (
            <div className="text-center py-6 text-zinc-600 text-sm">
              Adicione produtos ao carrinho para registrar a venda
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onFechar}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
              {itens.length > 0 ? "Fechar (manter carrinho)" : "Cancelar"}
            </button>
            <button type="submit" disabled={salvando || !itens.length}
              className="flex-1 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-green-500/20 transition-colors">
              {salvando ? "Registrando..." : `Finalizar${itens.length ? ` (${itens.length})` : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
