"use client"

import { useState, useEffect, useRef } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { catalogoProdutos, GRUPOS, SUBGRUPOS_ALCOOLICOS, type CatalogoProduto } from "@/data/catalogo-produtos"

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

function getStatus(stock: number, minStock: number) {
  if (stock === 0) return { label: "Sem estoque", style: "bg-red-500/10 text-red-400 border border-red-500/20" }
  if (stock <= minStock) return { label: "⚠ Crítico", style: "bg-red-500/10 text-red-400 border border-red-500/20" }
  if (stock <= minStock * 1.5) return { label: "Baixo", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20" }
  return { label: "OK", style: "bg-green-500/10 text-green-400 border border-green-500/20" }
}

function ComboboxGrupo({ value, onChange, grupos }: {
  value: string; onChange: (v: string) => void; grupos: string[]
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState(value)
  const [confirmarCriar, setConfirmarCriar] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setBusca(value) }, [value])

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false); setConfirmarCriar(false)
        if (!grupos.includes(busca)) setBusca(value)
      }
    }
    document.addEventListener("mousedown", fechar)
    return () => document.removeEventListener("mousedown", fechar)
  }, [busca, value, grupos])

  const filtrados = grupos.filter(g => g.toLowerCase().includes(busca.toLowerCase()))
  const exibirCriar = busca.trim().length > 0 && !grupos.some(g => g.toLowerCase() === busca.toLowerCase().trim())

  function selecionar(g: string) { onChange(g); setBusca(g); setAberto(false); setConfirmarCriar(false) }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); if (filtrados.length === 1) { selecionar(filtrados[0]); return }; if (exibirCriar) setConfirmarCriar(true) }
    if (e.key === "Escape") { setAberto(false); setConfirmarCriar(false) }
  }

  return (
    <div ref={ref} className="relative">
      <input value={busca} onChange={(e) => { setBusca(e.target.value); setAberto(true); setConfirmarCriar(false) }}
        onFocus={() => setAberto(true)} onKeyDown={handleKeyDown}
        placeholder="Selecionar ou digitar grupo..." required className={inputCls} />
      {aberto && (filtrados.length > 0 || exibirCriar) && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {filtrados.map(g => (
            <button key={g} type="button" onMouseDown={() => selecionar(g)}
              className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors">{g}</button>
          ))}
          {exibirCriar && (confirmarCriar ? (
            <div className="px-3 py-2 border-t border-zinc-700">
              <p className="text-xs text-zinc-400 mb-2">Criar grupo <span className="text-amber-400 font-medium">"{busca.trim()}"</span>?</p>
              <div className="flex gap-2">
                <button type="button" onMouseDown={() => selecionar(busca.trim())}
                  className="flex-1 bg-amber-500 text-black text-xs font-semibold py-1.5 rounded-lg">Criar</button>
                <button type="button" onMouseDown={() => setConfirmarCriar(false)}
                  className="flex-1 bg-zinc-700 text-zinc-300 text-xs py-1.5 rounded-lg">Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" onMouseDown={() => setConfirmarCriar(true)}
              className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-zinc-700 border-t border-zinc-700 transition-colors">
              + Criar grupo "{busca.trim()}"
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ModalAlcool({ subgrupo, onConfirm }: { subgrupo: string; onConfirm: (v: boolean) => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="text-3xl mb-3">🍺</div>
        <h3 className="text-white font-bold mb-1">{subgrupo}</h3>
        <p className="text-zinc-400 text-sm mb-5">Este produto contém álcool?</p>
        <div className="flex gap-3">
          <button onClick={() => onConfirm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-lg text-sm">Não</button>
          <button onClick={() => onConfirm(true)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-lg text-sm">Sim, contém álcool</button>
        </div>
      </div>
    </div>
  )
}

// Card reutilizável para catálogo
function CardCatalogo({ nome, foto, subcat, preco, noEstoque, inativo, hasAlcohol, onEditar, onClick }: {
  nome: string; foto?: string; subcat?: string; preco: number
  noEstoque: boolean; inativo: boolean; hasAlcohol: boolean
  onEditar?: () => void; onClick: () => void
}) {
  return (
    <div className={`relative rounded-xl border ${noEstoque ? "border-green-500/40" : inativo ? "border-zinc-600 opacity-50" : "border-zinc-800 hover:border-zinc-600"} transition-all`}>
      {onEditar && (
        <button onClick={(e) => { e.stopPropagation(); onEditar() }}
          className="absolute top-1.5 right-1.5 z-10 bg-zinc-900/80 hover:bg-zinc-700 text-zinc-300 text-xs w-6 h-6 rounded flex items-center justify-center transition-colors">
          ✏️
        </button>
      )}
      <button onClick={onClick} className="w-full text-left">
        <div className="aspect-square bg-zinc-800 rounded-t-xl overflow-hidden relative">
          {foto ? (
            <img src={foto} alt={nome} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-700">📦</div>
          )}
          {noEstoque && <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">✓</div>}
          {hasAlcohol && <div className="absolute bottom-1 left-1 bg-amber-500/80 text-black text-xs px-1 py-0.5 rounded font-bold">🔞</div>}
        </div>
        <div className="p-2">
          <div className="text-white text-xs font-medium leading-tight truncate">{nome}</div>
          <div className="text-amber-400 text-xs font-bold mt-0.5">R$ {preco.toFixed(2)}</div>
          <div className="text-zinc-600 text-xs">{subcat}</div>
        </div>
      </button>
    </div>
  )
}

export default function EstoquePage() {
  const [aba, setAba] = useState<"estoque" | "catalogo" | "pdv" | "movimentos">("estoque")
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [gruposExtras, setGruposExtras] = useState<string[]>([])
  const todosGrupos = [...Object.keys(GRUPOS), ...gruposExtras.filter(g => !Object.keys(GRUPOS).includes(g))]

  // Modal novo produto
  const [modalNovo, setModalNovo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [nome, setNome] = useState("")
  const [grupo, setGrupo] = useState("")
  const [subgrupo, setSubgrupo] = useState("")
  const [barcode, setBarcode] = useState("")
  const [custo, setCusto] = useState("")
  const [venda, setVenda] = useState("")
  const [estoqueInicial, setEstoqueInicial] = useState("0")
  const [estoqueMinimo, setEstoqueMinimo] = useState("5")
  const [photoUrl, setPhotoUrl] = useState("")
  const [hasAlcohol, setHasAlcohol] = useState(false)
  const [mostrarModalAlcool, setMostrarModalAlcool] = useState(false)
  const [subgrupoAlcoolPendente, setSubgrupoAlcoolPendente] = useState("")

  // Modal lançamento (ao clicar no catálogo)
  const [modalLancamento, setModalLancamento] = useState(false)
  const [itemLancando, setItemLancando] = useState<any | null>(null)
  const [qtdLancamento, setQtdLancamento] = useState("1")
  const [custoLancamento, setCustoLancamento] = useState("")
  const [vendaLancamento, setVendaLancamento] = useState("")
  const [salvandoLancamento, setSalvandoLancamento] = useState(false)

  // Modal editar produto do DB
  const [modalEditar, setModalEditar] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<any | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [nomeEdit, setNomeEdit] = useState("")
  const [grupoEdit, setGrupoEdit] = useState("")
  const [subgrupoEdit, setSubgrupoEdit] = useState("")
  const [barcodeEdit, setBarcodeEdit] = useState("")
  const [custoEdit, setCustoEdit] = useState("")
  const [vendaEdit, setVendaEdit] = useState("")
  const [minEdit, setMinEdit] = useState("")
  const [photoEdit, setPhotoEdit] = useState("")
  const [alcoolEdit, setAlcoolEdit] = useState(false)
  const [erroEdit, setErroEdit] = useState("")

  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({})
  function toggleGrupo(g: string) {
    setGruposColapsados(prev => ({ ...prev, [g]: !prev[g] }))
  }

  // FAB
  const [fabAberto, setFabAberto] = useState(false)

  // Entrada de mercadoria
  const [modalEntrada, setModalEntrada] = useState(false)
  const [buscaEntrada, setBuscaEntrada] = useState("")
  const [produtoEntrada, setProdutoEntrada] = useState<any | null>(null)
  const [qtdEntrada, setQtdEntrada] = useState("1")
  const [custoEntrada, setCustoEntrada] = useState("")
  const [motivoEntrada, setMotivoEntrada] = useState("")
  const [salvandoEntrada, setSalvandoEntrada] = useState(false)

  // Venda — carrinho multi-produto
  const [modalVenda, setModalVenda] = useState(false)
  const [itensVenda, setItensVenda] = useState<{ produto: any; qty: number; unitPrice: number }[]>([])
  const [clienteVenda, setClienteVenda] = useState("")
  const [buscaClienteVenda, setBuscaClienteVenda] = useState("")
  const [dropdownClienteAberto, setDropdownClienteAberto] = useState(false)
  const [buscaProdutoVenda, setBuscaProdutoVenda] = useState("")
  const [dropdownProdVenda, setDropdownProdVenda] = useState(false)
  const [salvandoVenda, setSalvandoVenda] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])

  // Movimentos
  const [movimentos, setMovimentos] = useState<any[]>([])
  const [loadingMovimentos, setLoadingMovimentos] = useState(false)

  const subgruposDaBase = GRUPOS[grupo] || []
  const todosSubgrupos = [...subgruposDaBase, ...produtos
    .filter(p => p.category === grupo && p.subCategory && !subgruposDaBase.includes(p.subCategory))
    .map(p => p.subCategory)
    .filter((v, i, a) => a.indexOf(v) === i)]

  const subgruposDaBaseEdit = GRUPOS[grupoEdit] || []
  const todosSubgruposEdit = [...subgruposDaBaseEdit, ...produtos
    .filter(p => p.category === grupoEdit && p.subCategory && !subgruposDaBaseEdit.includes(p.subCategory))
    .map(p => p.subCategory)
    .filter((v, i, a) => a.indexOf(v) === i)]

  useEffect(() => {
    catalogoProdutos.forEach(p => { if (p.photoUrl) { const img = new window.Image(); img.src = p.photoUrl } })
  }, [])

  useEffect(() => { buscarProdutos() }, [])
  useEffect(() => { if (aba === "movimentos") buscarMovimentos() }, [aba])
  useEffect(() => {
    fetch("/api/clientes").then(r => r.json()).then(d => setClientes(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function buscarProdutos() {
    setLoading(true)
    try {
      const res = await fetch("/api/estoque")
      const data = await res.json()
      const lista = Array.isArray(data) ? data : []
      setProdutos(lista)
      const cats = [...new Set(lista.map((p: any) => p.category).filter(Boolean))] as string[]
      setGruposExtras(cats)
    } catch { setErro("Erro ao carregar") }
    finally { setLoading(false) }
  }

  async function buscarMovimentos() {
    setLoadingMovimentos(true)
    try {
      const res = await fetch("/api/estoque/movimentos")
      const data = await res.json()
      setMovimentos(Array.isArray(data) ? data : [])
    } catch { /* silencioso */ }
    finally { setLoadingMovimentos(false) }
  }

  async function confirmarEntrada(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvandoEntrada(true)
    try {
      const res = await fetch("/api/estoque/movimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: produtoEntrada.id,
          type: "ENTRADA",
          quantity: qtdEntrada,
          reason: motivoEntrada || "Entrada de mercadoria",
          costPrice: custoEntrada || undefined,
        }),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || "Erro"); return }
      await buscarProdutos()
      await buscarMovimentos()
      setModalEntrada(false)
      setProdutoEntrada(null); setBuscaEntrada(""); setQtdEntrada("1"); setCustoEntrada(""); setMotivoEntrada("")
    } catch (err) { alert(String(err)) }
    finally { setSalvandoEntrada(false) }
  }

  async function confirmarVenda(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (itensVenda.length === 0) return
    setSalvandoVenda(true)
    try {
      for (const item of itensVenda) {
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
      await buscarProdutos()
      await buscarMovimentos()
      setModalVenda(false)
      setItensVenda([]); setClienteVenda(""); setBuscaClienteVenda(""); setBuscaProdutoVenda("")
    } catch (err) { alert(String(err)) }
    finally { setSalvandoVenda(false) }
  }

  function adicionarItemVenda(produto: any) {
    setItensVenda(prev => {
      const existe = prev.findIndex(i => i.produto.id === produto.id)
      if (existe >= 0) {
        const novo = [...prev]
        novo[existe] = { ...novo[existe], qty: novo[existe].qty + 1 }
        return novo
      }
      return [...prev, { produto, qty: 1, unitPrice: produto.salePrice }]
    })
    setBuscaProdutoVenda("")
    setDropdownProdVenda(false)
  }

  function resetarForm() {
    setNome(""); setGrupo(""); setSubgrupo(""); setBarcode("")
    setCusto(""); setVenda(""); setEstoqueInicial("0"); setEstoqueMinimo("5")
    setPhotoUrl(""); setHasAlcohol(false); setErro("")
  }

  function handleSubgrupoChange(sg: string) {
    if (grupo === "Bebidas" && SUBGRUPOS_ALCOOLICOS.includes(sg)) {
      setSubgrupoAlcoolPendente(sg); setMostrarModalAlcool(true)
    } else { setSubgrupo(sg); setHasAlcohol(false) }
  }

  function handleConfirmarAlcool(temAlcool: boolean) {
    setSubgrupo(subgrupoAlcoolPendente); setHasAlcohol(temAlcool)
    setMostrarModalAlcool(false); setSubgrupoAlcoolPendente("")
  }

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvando(true); setErro("")
    try {
      const res = await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, barcode, costPrice: custo, salePrice: venda, stock: estoqueInicial, minStock: estoqueMinimo, category: grupo, subCategory: subgrupo, hasAlcohol, photoUrl }),
      })
      if (!res.ok) { const d = await res.json(); setErro(d.error || "Erro"); return }
      await buscarProdutos()
      setModalNovo(false); resetarForm()
    } catch { setErro("Erro inesperado") }
    finally { setSalvando(false) }
  }

  // Abre modal de lançamento para item do catálogo ou produto do DB
  function abrirLancamento(item: CatalogoProduto | any) {
    setItemLancando(item)
    setQtdLancamento("1")
    setCustoLancamento(String(item.costPrice ?? ""))
    setVendaLancamento(String(item.salePrice ?? ""))
    setModalLancamento(true)
  }

  async function confirmarLancamento(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvandoLancamento(true)
    try {
      const existente = produtos.find(p => p.name === itemLancando.name && p.isActive)
      const inativo = produtos.find(p => p.name === itemLancando.name && !p.isActive)
      let res: Response

      if (inativo) {
        res = await fetch("/api/estoque", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: inativo.id, isActive: true, costPrice: custoLancamento, salePrice: vendaLancamento, stock: parseInt(qtdLancamento) }),
        })
      } else if (existente) {
        res = await fetch("/api/estoque", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: existente.id, costPrice: custoLancamento, salePrice: vendaLancamento, stock: existente.stock + parseInt(qtdLancamento) }),
        })
      } else {
        res = await fetch("/api/estoque", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: itemLancando.name,
            costPrice: custoLancamento, salePrice: vendaLancamento,
            stock: parseInt(qtdLancamento), minStock: 5,
            category: itemLancando.category, subCategory: itemLancando.subCategory,
            hasAlcohol: itemLancando.hasAlcohol ?? false,
            photoUrl: itemLancando.photoUrl ?? null,
          }),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        alert("Erro: " + (err.error || res.status))
        return
      }

      await buscarProdutos()
      setModalLancamento(false)
      setItemLancando(null)
    } catch (err) {
      alert("Erro ao lançar: " + String(err))
    } finally {
      setSalvandoLancamento(false)
    }
  }

  // Editar item do catálogo pré-definido: cria no banco se ainda não existir, depois abre edição
  async function editarItemCatalogo(p: CatalogoProduto) {
    const dbProduto = produtos.find(prod => prod.name === p.name)
    if (dbProduto) {
      abrirEditar(dbProduto)
      return
    }
    const res = await fetch("/api/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name, costPrice: p.costPrice, salePrice: p.salePrice,
        stock: 0, minStock: 5, category: p.category, subCategory: p.subCategory,
        hasAlcohol: p.hasAlcohol, photoUrl: p.photoUrl,
      }),
    })
    if (res.ok) {
      const novo = await res.json()
      await buscarProdutos()
      abrirEditar(novo)
    }
  }

  function abrirEditar(p: any) {
    setProdutoEditando(p)
    setNomeEdit(p.name); setGrupoEdit(p.category || ""); setSubgrupoEdit(p.subCategory || "")
    setBarcodeEdit(p.barcode || ""); setCustoEdit(String(p.costPrice)); setVendaEdit(String(p.salePrice))
    setMinEdit(String(p.minStock)); setPhotoEdit(p.photoUrl || ""); setAlcoolEdit(p.hasAlcohol ?? false)
    setErroEdit(""); setModalEditar(true)
  }

  async function handleSalvarEdicao(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvandoEdicao(true); setErroEdit("")
    try {
      const res = await fetch("/api/estoque", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: produtoEditando.id, name: nomeEdit, barcode: barcodeEdit,
          costPrice: custoEdit, salePrice: vendaEdit, minStock: minEdit,
          category: grupoEdit, subCategory: subgrupoEdit,
          hasAlcohol: alcoolEdit, photoUrl: photoEdit,
        }),
      })
      if (!res.ok) { const d = await res.json(); setErroEdit(d.error || "Erro"); return }
      await buscarProdutos()
      setModalEditar(false); setProdutoEditando(null)
    } catch { setErroEdit("Erro inesperado") }
    finally { setSalvandoEdicao(false) }
  }

  async function handleDesativar(id: string) {
    if (!confirm("Desativar este produto?")) return
    await fetch("/api/estoque", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: false }) })
    await buscarProdutos()
  }

  const produtosFiltrados = produtos.filter(p =>
    p.isActive && (p.name?.toLowerCase().includes(busca.toLowerCase()) || p.barcode?.includes(busca))
  )
  const criticos = produtos.filter(p => p.isActive && p.stock <= p.minStock).length
  const totalEstoque = produtos.filter(p => p.isActive).reduce((s: number, p: any) => s + (p.stock * p.costPrice), 0)

  // Produtos do DB que NÃO estão no catálogo pré-definido (criados manualmente)
  const nomesCatalogo = new Set(catalogoProdutos.map(p => p.name))
  const meusProdutos = produtos.filter(p => !nomesCatalogo.has(p.name))

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Estoque & PDV</h1>
          <p className="text-zinc-500 text-sm">{produtos.filter(p => p.isActive).length} produtos · {criticos} críticos</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-blue-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Valor em estoque</div>
          <div className="text-blue-400 text-xl font-bold">R$ {totalEstoque.toFixed(2)}</div>
          <div className="text-zinc-600 text-xs mt-1">{produtos.filter(p => p.isActive).length} ativos</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-red-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Itens críticos</div>
          <div className="text-red-400 text-xl font-bold">{criticos}</div>
          <div className="text-zinc-600 text-xs mt-1">abaixo do mínimo</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-amber-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Catálogo</div>
          <div className="text-amber-400 text-xl font-bold">{catalogoProdutos.length + meusProdutos.length}</div>
          <div className="text-zinc-600 text-xs mt-1">pré-definidos + meus</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "estoque", label: "📦 Estoque" },
          { id: "catalogo", label: "🛍 Catálogo" },
          { id: "pdv", label: "💳 PDV" },
          { id: "movimentos", label: "📋 Movimentos" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ABA ESTOQUE */}
      {aba === "estoque" && (
        <div>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto ou código de barras..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600 mb-3" />
          {loading ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">Carregando...</div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <div className="text-zinc-600 text-sm mb-2">Nenhum produto no estoque</div>
              <button onClick={() => setAba("catalogo")} className="text-amber-400 text-sm hover:text-amber-300">Importar do catálogo →</button>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Produto</th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Grupo</th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Estoque</th>
                    <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Venda</th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.map((p, i) => {
                    const status = getStatus(p.stock, p.minStock)
                    return (
                      <tr key={p.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors ${i === produtosFiltrados.length - 1 ? "border-0" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-zinc-800" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600 flex-shrink-0">📦</div>
                            )}
                            <div>
                              <div className="text-white text-sm font-medium">{p.name}</div>
                              <div className="text-zinc-600 text-xs">{p.barcode || p.subCategory || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-400 text-xs">{p.category || "—"}</div>
                          {p.hasAlcohol && <div className="text-amber-500 text-xs">🔞</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`text-sm font-bold ${p.stock <= p.minStock ? "text-red-400" : "text-white"}`}>{p.stock}</div>
                          <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div className={`h-full rounded-full ${p.stock <= p.minStock ? "bg-red-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(100, (p.stock / Math.max(p.minStock * 2, 1)) * 100)}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">R$ {p.salePrice?.toFixed(2)}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${status.style}`}>{status.label}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => abrirEditar(p)} className="text-zinc-600 hover:text-amber-400 text-xs transition-colors">Editar</button>
                            <button onClick={() => handleDesativar(p.id)} className="text-zinc-600 hover:text-red-400 text-xs transition-colors">Desativar</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA CATÁLOGO */}
      {aba === "catalogo" && (
        <div>
          <p className="text-zinc-500 text-xs mb-4">Clique em um produto para lançar no estoque. Passe o mouse para editar seus produtos.</p>

          {/* Produtos pré-definidos por grupo */}
          {Object.keys(GRUPOS).map(grp => {
            const itens = catalogoProdutos.filter(p => p.category === grp)
            if (!itens.length) return null
            const colapsado = gruposColapsados[grp]
            return (
              <div key={grp} className="mb-6">
                <button onClick={() => toggleGrupo(grp)}
                  className="flex items-center gap-2 w-full text-left mb-3 group">
                  <span className={`text-zinc-500 text-xs transition-transform ${colapsado ? "-rotate-90" : ""}`}>▼</span>
                  <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono group-hover:text-zinc-200 transition-colors">{grp}</span>
                  <span className="text-zinc-600 text-xs">({itens.length})</span>
                </button>
                {!colapsado && (
                  <div className="grid grid-cols-4 gap-3">
                    {itens.map(p => {
                      const noEstoque = produtos.find(prod => prod.name === p.name && prod.isActive)
                      const inativo = produtos.find(prod => prod.name === p.name && !prod.isActive)
                      return (
                        <CardCatalogo key={p.name}
                          nome={p.name} foto={p.photoUrl} subcat={p.subCategory}
                          preco={p.salePrice} noEstoque={!!noEstoque} inativo={!!inativo} hasAlcohol={p.hasAlcohol}
                          onClick={() => abrirLancamento(p)}
                          onEditar={() => editarItemCatalogo(p)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Meus Produtos (criados manualmente) */}
          {meusProdutos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Meus Produtos</h3>
              <div className="grid grid-cols-4 gap-3">
                {meusProdutos.map(p => (
                  <CardCatalogo key={p.id}
                    nome={p.name} foto={p.photoUrl} subcat={p.subCategory}
                    preco={p.salePrice} noEstoque={p.isActive} inativo={!p.isActive} hasAlcohol={p.hasAlcohol}
                    onClick={() => abrirLancamento(p)}
                    onEditar={() => abrirEditar(p)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA PDV */}
      {aba === "pdv" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">💳</div>
          <div className="text-white font-medium mb-1">Ponto de Venda</div>
          <div className="text-zinc-500 text-sm">Em breve</div>
        </div>
      )}

      {/* ABA MOVIMENTOS */}
      {aba === "movimentos" && (
        <div>
          {loadingMovimentos ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">Carregando...</div>
          ) : movimentos.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">📋</div>
              <div className="text-zinc-500 text-sm">Nenhum movimento registrado ainda</div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Data</th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Produto</th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Tipo</th>
                    <th className="text-center px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Qtd</th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentos.map((m, i) => (
                    <tr key={m.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === movimentos.length - 1 ? "border-0" : ""}`}>
                      <td className="px-4 py-3 text-zinc-500 text-xs font-mono whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString("pt-BR")} {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-white text-sm">{m.product?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.type === "ENTRADA" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                          {m.type === "ENTRADA" ? "↑ Entrada" : "↓ Saída"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold font-mono ${m.type === "ENTRADA" ? "text-green-400" : "text-red-400"}`}>
                          {m.type === "ENTRADA" ? "+" : "-"}{m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-500 text-sm">{m.reason || "—"}</div>
                        {m.type === "SAIDA" && m.unitPrice != null && m.product?.salePrice && m.unitPrice < m.product.salePrice && (
                          <div className="text-orange-400 text-xs mt-0.5">
                            {((1 - m.unitPrice / m.product.salePrice) * 100).toFixed(0)}% desconto
                            · R$ {m.unitPrice.toFixed(2)} (tabela R$ {m.product.salePrice.toFixed(2)})
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL LANÇAMENTO DO CATÁLOGO */}
      {modalLancamento && itemLancando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div>
                <h2 className="text-white font-bold">Lançar no Estoque</h2>
                <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-[240px]">{itemLancando.name}</p>
              </div>
              <button onClick={() => setModalLancamento(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={confirmarLancamento} className="p-5 space-y-3">
              {itemLancando.photoUrl && (
                <img src={itemLancando.photoUrl} alt={itemLancando.name}
                  className="w-full h-32 object-cover rounded-xl bg-zinc-800"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
              )}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Quantidade *</label>
                <input value={qtdLancamento} onChange={(e) => setQtdLancamento(e.target.value)}
                  required type="number" min="1" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço de custo *</label>
                  <input value={custoLancamento} onChange={(e) => setCustoLancamento(e.target.value)}
                    required type="number" min="0" step="0.01" placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço de venda *</label>
                  <input value={vendaLancamento} onChange={(e) => setVendaLancamento(e.target.value)}
                    required type="number" min="0" step="0.01" placeholder="0.00" className={inputCls} />
                </div>
              </div>
              {custoLancamento && vendaLancamento && (
                <div className="bg-zinc-800 rounded-lg px-3 py-2 flex justify-between text-xs">
                  <span className="text-zinc-500">Margem</span>
                  <span className="text-green-400 font-bold">
                    {(((parseFloat(vendaLancamento) - parseFloat(custoLancamento)) / parseFloat(custoLancamento)) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalLancamento(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={salvandoLancamento}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvandoLancamento ? "Lançando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PRODUTO */}
      {modalEditar && produtoEditando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-white font-bold">Editar Produto</h2>
              <button onClick={() => setModalEditar(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleSalvarEdicao} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome *</label>
                <input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Grupo</label>
                <ComboboxGrupo value={grupoEdit} onChange={(g) => { setGrupoEdit(g); setSubgrupoEdit("") }} grupos={todosGrupos} />
              </div>
              {grupoEdit && (
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Subgrupo</label>
                  <select value={subgrupoEdit} onChange={(e) => setSubgrupoEdit(e.target.value)} className={inputCls}>
                    <option value="">—</option>
                    {todosSubgruposEdit.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Código de barras</label>
                <input value={barcodeEdit} onChange={(e) => setBarcodeEdit(e.target.value)} placeholder="—" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço de custo *</label>
                  <input value={custoEdit} onChange={(e) => setCustoEdit(e.target.value)} required type="number" min="0" step="0.01" className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço de venda *</label>
                  <input value={vendaEdit} onChange={(e) => setVendaEdit(e.target.value)} required type="number" min="0" step="0.01" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Estoque mínimo</label>
                <input value={minEdit} onChange={(e) => setMinEdit(e.target.value)} type="number" min="0" className={inputCls} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Link da foto</label>
                <input value={photoEdit} onChange={(e) => setPhotoEdit(e.target.value)} placeholder="https://..." className={inputCls} />
              </div>
              <div onClick={() => setAlcoolEdit(!alcoolEdit)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${alcoolEdit ? "bg-amber-500/10 border-amber-500/30" : "bg-zinc-800 border-zinc-700"}`}>
                <div className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 flex-shrink-0 ${alcoolEdit ? "bg-amber-500 justify-end" : "bg-zinc-700 justify-start"}`}>
                  <div className="w-4 h-4 bg-white rounded-full shadow" />
                </div>
                <span className={`text-sm ${alcoolEdit ? "text-amber-400" : "text-zinc-400"}`}>🔞 Produto alcoólico</span>
              </div>
              {erroEdit && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erroEdit}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalEditar(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={salvandoEdicao}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvandoEdicao ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO PRODUTO */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-white font-bold">Novo Produto</h2>
              <button onClick={() => setModalNovo(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome do produto *</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: Pomada Matte" className={inputCls} />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Grupo de mercadorias *</label>
                <ComboboxGrupo value={grupo} onChange={(g) => { setGrupo(g); setSubgrupo(""); setHasAlcohol(false) }} grupos={todosGrupos} />
              </div>
              {grupo && (
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Subgrupo</label>
                  <select value={subgrupo} onChange={(e) => handleSubgrupoChange(e.target.value)} className={inputCls}>
                    <option value="">Selecionar...</option>
                    {todosSubgrupos.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                  </select>
                  {hasAlcohol && <p className="text-amber-400 text-xs mt-1">🔞 Marcado como alcoólico</p>}
                </div>
              )}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Código de barras</label>
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Ex: 7891234567890" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço de custo *</label>
                  <input value={custo} onChange={(e) => setCusto(e.target.value)} required type="number" min="0" step="0.01" placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Preço de venda *</label>
                  <input value={venda} onChange={(e) => setVenda(e.target.value)} required type="number" min="0" step="0.01" placeholder="0.00" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Estoque inicial</label>
                  <input value={estoqueInicial} onChange={(e) => setEstoqueInicial(e.target.value)} type="number" min="0" placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Estoque mínimo</label>
                  <input value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} type="number" min="0" placeholder="5" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Link da foto</label>
                <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className={inputCls} />
              </div>
              {erro && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erro}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalNovo(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvando ? "Salvando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalAlcool && <ModalAlcool subgrupo={subgrupoAlcoolPendente} onConfirm={handleConfirmarAlcool} />}

      {/* FAB — botão flutuante */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {fabAberto && (
          <>
            <button onClick={() => { setFabAberto(false); resetarForm(); setModalNovo(true) }}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all">
              <span>📦</span> Novo Produto
            </button>
            <button onClick={() => { setFabAberto(false); setProdutoEntrada(null); setBuscaEntrada(""); setQtdEntrada("1"); setCustoEntrada(""); setMotivoEntrada(""); setModalEntrada(true) }}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all">
              <span>📥</span> Entrada de Mercadoria
            </button>
            <button onClick={() => { setFabAberto(false); setItensVenda([]); setClienteVenda(""); setBuscaClienteVenda(""); setBuscaProdutoVenda(""); setDropdownClienteAberto(false); setModalVenda(true) }}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all">
              <span>💳</span> Venda
            </button>
          </>
        )}
        <button onClick={() => setFabAberto(prev => !prev)}
          className={`w-14 h-14 rounded-full shadow-xl text-2xl font-bold transition-all ${fabAberto ? "bg-zinc-700 rotate-45 text-white" : "bg-amber-500 hover:bg-amber-400 text-black"}`}>
          +
        </button>
      </div>

      {/* MODAL ENTRADA DE MERCADORIA */}
      {modalEntrada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Entrada de Mercadoria</h2>
              <button onClick={() => setModalEntrada(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {!produtoEntrada ? (
                <>
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Buscar produto no catálogo</label>
                    <input value={buscaEntrada} onChange={(e) => setBuscaEntrada(e.target.value)}
                      placeholder="Digite o nome do produto..." autoFocus className={inputCls} />
                  </div>
                  {buscaEntrada.trim().length > 1 && (() => {
                    const resultados = produtos.filter(p => p.name.toLowerCase().includes(buscaEntrada.toLowerCase()))
                    return resultados.length > 0 ? (
                      <div className="bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                        {resultados.map(p => (
                          <button key={p.id} onClick={() => { setProdutoEntrada(p); setCustoEntrada(String(p.costPrice)) }}
                            className="w-full text-left px-3 py-2.5 hover:bg-zinc-700 border-b border-zinc-700 last:border-0 transition-colors">
                            <div className="text-white text-sm font-medium">{p.name}</div>
                            <div className="text-zinc-500 text-xs">Estoque atual: {p.stock} · R$ {p.costPrice?.toFixed(2)}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-zinc-800 rounded-lg p-3 text-center">
                        <p className="text-zinc-500 text-sm mb-2">Produto não encontrado no catálogo</p>
                        <button onClick={() => { setModalEntrada(false); resetarForm(); setNome(buscaEntrada); setModalNovo(true) }}
                          className="text-amber-400 text-sm hover:text-amber-300 font-medium">
                          + Cadastrar "{buscaEntrada}"
                        </button>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <form onSubmit={confirmarEntrada} className="space-y-3">
                  <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white text-sm font-medium">{produtoEntrada.name}</div>
                      <div className="text-zinc-500 text-xs">Estoque atual: {produtoEntrada.stock}</div>
                    </div>
                    <button type="button" onClick={() => setProdutoEntrada(null)} className="text-zinc-600 hover:text-zinc-400 text-xs">trocar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 text-xs mb-1 block">Quantidade *</label>
                      <input value={qtdEntrada} onChange={(e) => setQtdEntrada(e.target.value)}
                        required type="number" min="1" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-zinc-400 text-xs mb-1 block">Preço de custo</label>
                      <input value={custoEntrada} onChange={(e) => setCustoEntrada(e.target.value)}
                        type="number" min="0" step="0.01" placeholder={String(produtoEntrada.costPrice)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Motivo / Observação</label>
                    <input value={motivoEntrada} onChange={(e) => setMotivoEntrada(e.target.value)}
                      placeholder="Ex: Compra do fornecedor, devolução..." className={inputCls} />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setModalEntrada(false)}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                    <button type="submit" disabled={salvandoEntrada}
                      className="flex-1 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-green-500/20 transition-colors">
                      {salvandoEntrada ? "Salvando..." : "Confirmar entrada"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL VENDA */}
      {modalVenda && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-white font-bold">Venda</h2>
              <button onClick={() => setModalVenda(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={confirmarVenda} className="p-5 space-y-4">

              {/* Cliente */}
              <div className="relative">
                <label className="text-zinc-400 text-xs mb-1 block">Cliente</label>
                <input value={buscaClienteVenda}
                  onChange={(e) => { setBuscaClienteVenda(e.target.value); setClienteVenda(e.target.value); setDropdownClienteAberto(true) }}
                  onFocus={() => setDropdownClienteAberto(true)}
                  onBlur={() => setTimeout(() => setDropdownClienteAberto(false), 150)}
                  onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") setDropdownClienteAberto(false) }}
                  placeholder="Buscar ou digitar nome..."
                  className={inputCls} />
                {dropdownClienteAberto && buscaClienteVenda.length > 1 && (() => {
                  const hits = clientes.filter(c => c.name.toLowerCase().includes(buscaClienteVenda.toLowerCase()) || c.phone?.includes(buscaClienteVenda)).slice(0, 5)
                  return hits.length > 0 ? (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                      {hits.map(c => (
                        <button key={c.id} type="button"
                          onMouseDown={() => { setBuscaClienteVenda(c.name); setClienteVenda(c.name); setDropdownClienteAberto(false) }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors">
                          <div className="text-white text-sm">{c.name}</div>
                          <div className="text-zinc-500 text-xs">{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>

              {/* Busca de produto */}
              <div className="relative">
                <label className="text-zinc-400 text-xs mb-1 block">Adicionar produto</label>
                <input value={buscaProdutoVenda}
                  onChange={(e) => { setBuscaProdutoVenda(e.target.value); setDropdownProdVenda(true) }}
                  onFocus={() => setDropdownProdVenda(true)}
                  onBlur={() => setTimeout(() => setDropdownProdVenda(false), 150)}
                  placeholder="Digite para buscar produto..."
                  className={inputCls} />
                {dropdownProdVenda && buscaProdutoVenda.length > 0 && (() => {
                  const hits = produtos.filter(p => p.isActive && p.stock > 0 && p.name.toLowerCase().includes(buscaProdutoVenda.toLowerCase())).slice(0, 6)
                  return hits.length > 0 ? (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                      {hits.map(p => (
                        <button key={p.id} type="button" onMouseDown={() => adicionarItemVenda(p)}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700 last:border-0 transition-colors">
                          <div className="text-white text-sm">{p.name}</div>
                          <div className="text-zinc-500 text-xs">R$ {p.salePrice?.toFixed(2)} · estoque: {p.stock}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-500 text-sm shadow-xl">
                      Nenhum produto encontrado com estoque disponível
                    </div>
                  )
                })()}
              </div>

              {/* Carrinho */}
              {itensVenda.length > 0 && (
                <div className="space-y-2">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider">Itens</p>
                  {itensVenda.map((item, idx) => {
                    const desconto = item.unitPrice < item.produto.salePrice
                      ? ((1 - item.unitPrice / item.produto.salePrice) * 100).toFixed(0)
                      : null
                    return (
                      <div key={idx} className="bg-zinc-800 rounded-lg p-3 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{item.produto.name}</div>
                          {desconto && <div className="text-orange-400 text-xs">{desconto}% de desconto</div>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-zinc-500 text-xs">Qtd</span>
                          <input type="number" min="1" max={item.produto.stock} value={item.qty}
                            onChange={(e) => setItensVenda(prev => prev.map((it, i) => i === idx ? { ...it, qty: Math.max(1, parseInt(e.target.value) || 1) } : it))}
                            className="w-14 bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm outline-none text-center" />
                          <span className="text-zinc-500 text-xs">R$</span>
                          <input type="number" min="0" step="0.01" value={item.unitPrice}
                            onChange={(e) => setItensVenda(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: parseFloat(e.target.value) || 0 } : it))}
                            className="w-20 bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm outline-none" />
                          <button type="button" onClick={() => setItensVenda(prev => prev.filter((_, i) => i !== idx))}
                            className="text-zinc-600 hover:text-red-400 transition-colors ml-1">✕</button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Total */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Total da venda</span>
                      <span className="text-green-400 font-bold text-lg">
                        R$ {itensVenda.reduce((s, i) => s + i.qty * i.unitPrice, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-zinc-600 text-xs mt-0.5">
                      {itensVenda.reduce((s, i) => s + i.qty, 0)} {itensVenda.reduce((s, i) => s + i.qty, 0) === 1 ? "item" : "itens"}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalVenda(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={salvandoVenda || itensVenda.length === 0}
                  className="flex-1 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-green-500/20 transition-colors">
                  {salvandoVenda ? "Registrando..." : `Registrar venda (${itensVenda.length} item${itensVenda.length !== 1 ? "s" : ""})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}
