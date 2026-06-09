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
  const [grupoAtivo, setGrupoAtivo] = useState("Todos")
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortCol(col); setSortDir("desc") }
  }
  const todosGrupos = [...Object.keys(GRUPOS), ...gruposExtras.filter(g => !Object.keys(GRUPOS).includes(g))]

  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  function getStats(produto: any) {
    const movs = produto?.stockMovements ?? []
    if (!movs.length) return null
    const saidas = movs.filter((m: any) => m.type === "SAIDA")
    const entradas = movs.filter((m: any) => m.type === "ENTRADA")
    const precos = saidas.map((m: any) => m.unitPrice).filter(Boolean)

    // Dia da semana que mais vende
    const porDia: Record<number, number> = {}
    saidas.forEach((m: any) => {
      const d = new Date(m.createdAt).getDay()
      porDia[d] = (porDia[d] ?? 0) + m.quantity
    })
    const diaMaisVende = saidas.length
      ? Number(Object.entries(porDia).sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1)
      : null

    // Hora que mais vende
    const porHora: Record<number, number> = {}
    saidas.forEach((m: any) => {
      const h = new Date(m.createdAt).getHours()
      porHora[h] = (porHora[h] ?? 0) + m.quantity
    })
    const horaMaisVende = saidas.length
      ? Number(Object.entries(porHora).sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1)
      : null

    return {
      totalVendas: saidas.reduce((s: number, m: any) => s + m.quantity, 0),
      precoMin: precos.length ? Math.min(...precos) : null,
      precoMax: precos.length ? Math.max(...precos) : null,
      ultimaCompra: entradas[0]?.createdAt ?? null,
      ultimaVenda: saidas[0]?.createdAt ?? null,
      diaMaisVende,
      horaMaisVende,
    }
  }

  function fmtData(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }

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

  // Entrada de mercadoria
  const [modalEntrada, setModalEntrada] = useState(false)
  const [tipoEntrada, setTipoEntrada] = useState<"simples" | "estratificada">("simples")
  const [motivoEntrada, setMotivoEntrada] = useState("")
  const [salvandoEntrada, setSalvandoEntrada] = useState(false)
  // Simples — multi-produto
  const [itensEntrada, setItensEntrada] = useState<{ id: string; produto: any; qty: string; custo: string }[]>([])
  const [buscaEntrada, setBuscaEntrada] = useState("")
  const [dropdownEntrada, setDropdownEntrada] = useState(false)
  // Estratificada — NF-e
  const [chaveNfe, setChaveNfe] = useState("")
  const [dadosNfe, setDadosNfe] = useState<any>(null)
  const [buscandoNfe, setBuscandoNfe] = useState(false)
  const [erroNfe, setErroNfe] = useState("")
  const [itensNfe, setItensNfe] = useState<{ desc: string; qty: string; custo: string; produto: any | null }[]>([])

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

  // Vendas (PDV)
  const [vendas, setVendas] = useState<any[]>([])
  const [loadingVendas, setLoadingVendas] = useState(false)
  const [erroVendas, setErroVendas] = useState("")
  const [filtroDataVendas, setFiltroDataVendas] = useState("")

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
  useEffect(() => { if (aba === "pdv") buscarVendas() }, [aba])
  useEffect(() => {
    function onVendaRegistrada() { buscarProdutos(); buscarVendas(); if (aba === "movimentos") buscarMovimentos() }
    window.addEventListener("vendaRegistrada", onVendaRegistrada)
    return () => window.removeEventListener("vendaRegistrada", onVendaRegistrada)
  }, [aba, filtroDataVendas])

  // Responde ao FAB global
  useEffect(() => {
    function onNovoProduto() { resetarForm(); setModalNovo(true) }
    function onEntradaMercadoria() { setModalEntrada(true) }
    window.addEventListener("abrirNovoProduto", onNovoProduto)
    window.addEventListener("abrirEntradaMercadoria", onEntradaMercadoria)
    return () => {
      window.removeEventListener("abrirNovoProduto", onNovoProduto)
      window.removeEventListener("abrirEntradaMercadoria", onEntradaMercadoria)
    }
  }, [])
  useEffect(() => {
    fetch("/api/clientes?modo=simples").then(r => r.json()).then(d => setClientes(Array.isArray(d) ? d : [])).catch(() => {})
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

  async function buscarVendas(data?: string) {
    setLoadingVendas(true)
    setErroVendas("")
    try {
      const d = data !== undefined ? data : filtroDataVendas
      const url = d ? `/api/estoque/vendas?data=${d}` : "/api/estoque/vendas"
      const res = await fetch(url)
      const payload = await res.json()
      if (!res.ok) { setErroVendas(payload.error || `Erro ${res.status}`); return }
      setVendas(Array.isArray(payload) ? payload : [])
    } catch (err) {
      setErroVendas(String(err))
    } finally {
      setLoadingVendas(false)
    }
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

  function fecharModalEntrada() {
    setModalEntrada(false)
    setTipoEntrada("simples")
    setItensEntrada([]); setBuscaEntrada(""); setDropdownEntrada(false); setMotivoEntrada("")
    setChaveNfe(""); setDadosNfe(null); setErroNfe(""); setItensNfe([])
  }

  async function buscarNfe() {
    if (chaveNfe.replace(/\D/g,"").length !== 44) { setErroNfe("Chave deve ter 44 dígitos."); return }
    setBuscandoNfe(true); setErroNfe(""); setDadosNfe(null); setItensNfe([])
    try {
      const res = await fetch(`/api/estoque/nfe?chave=${chaveNfe.replace(/\D/g,"")}`)
      const data = await res.json()
      if (!res.ok) { setErroNfe(data.error || "Erro ao consultar NF-e"); return }
      setDadosNfe(data)
      setItensNfe((data.itens ?? []).map((it: any) => ({
        desc: it.descricao ?? "",
        qty: String(it.quantidade ?? 1),
        custo: String(it.valorUnitario ?? ""),
        produto: null,
      })))
    } catch (err) { setErroNfe(String(err)) }
    finally { setBuscandoNfe(false) }
  }

  async function confirmarEntrada(e: { preventDefault: () => void }) {
    e.preventDefault()
    const itens = tipoEntrada === "simples"
      ? itensEntrada.filter(i => i.produto && Number(i.qty) > 0)
      : itensNfe.filter(i => i.produto && Number(i.qty) > 0)

    if (itens.length === 0) { alert("Adicione ao menos um produto."); return }
    setSalvandoEntrada(true)
    try {
      await Promise.all(itens.map(item =>
        fetch("/api/estoque/movimentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.produto.id,
            type: "ENTRADA",
            quantity: Number(item.qty),
            reason: motivoEntrada || (tipoEntrada === "estratificada" && dadosNfe ? `NF-e ${dadosNfe.numero}` : "Entrada de mercadoria"),
            costPrice: Number(item.custo) || undefined,
          }),
        })
      ))
      await buscarProdutos()
      await buscarMovimentos()
      fecharModalEntrada()
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
      {aba === "catalogo" && (() => {
        // Grupos disponíveis para as abas
        const gruposDisponiveis = ["Todos", ...Object.keys(GRUPOS).filter(g => catalogoProdutos.some(p => p.category === g)), ...(meusProdutos.length ? ["Meus Produtos"] : [])]

        // Ordenação dos itens
        function sortarItens<T extends any[]>(itens: T, ehDbItem: boolean): T {
          if (!sortCol) return itens
          return [...itens].sort((a, b) => {
            const dbA = ehDbItem ? a : (produtos.find(p => p.name === a.name) ?? null)
            const dbB = ehDbItem ? b : (produtos.find(p => p.name === b.name) ?? null)
            const stA = getStats(dbA)
            const stB = getStats(dbB)
            let va: any, vb: any
            switch (sortCol) {
              case "nome":    va = a.name ?? ""; vb = b.name ?? ""; break
              case "vendas":  va = stA?.totalVendas ?? -1; vb = stB?.totalVendas ?? -1; break
              case "precoMin": va = stA?.precoMin ?? -1; vb = stB?.precoMin ?? -1; break
              case "preco":   va = (dbA?.salePrice ?? a?.salePrice) ?? 0; vb = (dbB?.salePrice ?? b?.salePrice) ?? 0; break
              case "precoMax": va = stA?.precoMax ?? -1; vb = stB?.precoMax ?? -1; break
              case "inclusao": va = dbA?.createdAt ?? ""; vb = dbB?.createdAt ?? ""; break
              case "compra":  va = stA?.ultimaCompra ?? ""; vb = stB?.ultimaCompra ?? ""; break
              case "venda":   va = stA?.ultimaVenda ?? ""; vb = stB?.ultimaVenda ?? ""; break
              case "estoque": va = (dbA?.stock ?? -1); vb = (dbB?.stock ?? -1); break
              case "dia":     va = stA?.diaMaisVende ?? -1; vb = stB?.diaMaisVende ?? -1; break
              case "hora":    va = stA?.horaMaisVende ?? -1; vb = stB?.horaMaisVende ?? -1; break
              default: return 0
            }
            if (va < vb) return sortDir === "desc" ? 1 : -1
            if (va > vb) return sortDir === "desc" ? -1 : 1
            return 0
          }) as T
        }

        // Itens do grupo ativo
        const itensCatalogo: any[] = grupoAtivo === "Todos"
          ? catalogoProdutos
          : grupoAtivo === "Meus Produtos"
          ? []
          : catalogoProdutos.filter(p => p.category === grupoAtivo)

        const itensMeus: any[] = grupoAtivo === "Todos" || grupoAtivo === "Meus Produtos" ? meusProdutos : []

        // Linha de produto do catálogo (estático + match com DB)
        function LinhaItem({ cat, dbProd, onEditar }: { cat?: any; dbProd?: any; onEditar?: () => void }) {
          const nome = cat?.name ?? dbProd?.name ?? ""
          const foto = cat?.photoUrl ?? dbProd?.photoUrl
          const subcat = cat?.subCategory ?? dbProd?.subCategory
          const precoAtual = dbProd?.salePrice ?? cat?.salePrice ?? 0
          const noEstoque = dbProd && dbProd.isActive
          const stats = dbProd ? getStats(dbProd) : null
          const inclusao = dbProd?.createdAt ?? null
          const item = cat ?? dbProd

          return (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 hover:bg-zinc-800/40 cursor-pointer transition-colors group"
              onClick={() => abrirLancamento(item)}>
              {/* Foto */}
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                {foto
                  ? <img src={foto} alt={nome} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                  : <div className="w-full h-full flex items-center justify-center text-zinc-700 text-sm">📦</div>
                }
              </div>

              {/* Nome */}
              <div className="w-44 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium truncate">{nome}</span>
                  {noEstoque && <span className="text-green-500 text-xs">●</span>}
                </div>
                <div className="text-zinc-600 text-xs truncate">{subcat}</div>
              </div>

              {/* Histórico vendas */}
              <div className="w-20 flex-shrink-0 text-center">
                {stats?.totalVendas ? (
                  <span className="text-zinc-300 text-xs">{stats.totalVendas} vend.</span>
                ) : <span className="text-zinc-700 text-xs">—</span>}
              </div>

              {/* Mín */}
              <div className="w-20 flex-shrink-0 text-center">
                {stats?.precoMin != null
                  ? <span className="text-zinc-400 text-xs font-mono">{stats.precoMin.toFixed(2)}</span>
                  : <span className="text-zinc-700 text-xs">—</span>}
              </div>

              {/* Atual */}
              <div className="w-20 flex-shrink-0 text-center">
                {dbProd
                  ? <span className="text-amber-400 text-xs font-medium font-mono">{precoAtual.toFixed(2)}</span>
                  : <span className="text-zinc-700 text-xs">—</span>}
              </div>

              {/* Máx */}
              <div className="w-20 flex-shrink-0 text-center">
                {stats?.precoMax != null
                  ? <span className="text-zinc-400 text-xs font-mono">{stats.precoMax.toFixed(2)}</span>
                  : <span className="text-zinc-700 text-xs">—</span>}
              </div>

              {/* Estoque atual */}
              <div className="w-20 flex-shrink-0 text-center">
                {dbProd != null
                  ? <span className={`text-xs font-mono font-medium ${dbProd.stock <= (dbProd.minStock ?? 5) ? "text-red-400" : "text-white"}`}>{dbProd.stock}</span>
                  : <span className="text-zinc-700 text-xs">—</span>}
              </div>

              {/* Inclusão */}
              <div className="w-20 flex-shrink-0 text-center">
                <span className="text-zinc-600 text-xs">{fmtData(inclusao)}</span>
              </div>

              {/* Última compra */}
              <div className="w-20 flex-shrink-0 text-center">
                <span className="text-zinc-600 text-xs">{fmtData(stats?.ultimaCompra ?? null)}</span>
              </div>

              {/* Última venda */}
              <div className="w-20 flex-shrink-0 text-center">
                <span className="text-zinc-600 text-xs">{fmtData(stats?.ultimaVenda ?? null)}</span>
              </div>

              {/* Dia top */}
              <div className="w-16 flex-shrink-0 text-center">
                {stats?.diaMaisVende != null && stats.diaMaisVende >= 0
                  ? <span className="text-zinc-300 text-xs">{DIAS_SEMANA[stats.diaMaisVende]}</span>
                  : <span className="text-zinc-700 text-xs">—</span>}
              </div>

              {/* Hora top */}
              <div className="w-16 flex-shrink-0 text-center">
                {stats?.horaMaisVende != null && stats.horaMaisVende >= 0
                  ? <span className="text-zinc-300 text-xs">{String(stats.horaMaisVende).padStart(2, "0")}h</span>
                  : <span className="text-zinc-700 text-xs">—</span>}
              </div>

              {/* Editar */}
              {onEditar && (
                <button onClick={(e) => { e.stopPropagation(); onEditar() }}
                  className="ml-auto text-zinc-700 hover:text-amber-400 text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  ✏️
                </button>
              )}
            </div>
          )
        }

        return (
          <div>
            {/* Abas de grupo */}
            <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1 overflow-x-auto flex-wrap">
              {gruposDisponiveis.map(g => (
                <button key={g} onClick={() => setGrupoAtivo(g)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${grupoAtivo === g ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                  {g}
                </button>
              ))}
            </div>

            {/* Cabeçalho interativo */}
            {(() => {
              function Th({ col, label, className }: { col: string; label: string; className?: string }) {
                const ativo = sortCol === col
                return (
                  <button onClick={() => handleSort(col)}
                    className={`${className} flex items-center justify-center gap-1 text-xs uppercase tracking-wide font-mono transition-colors select-none ${ativo ? "text-amber-400" : "text-zinc-600 hover:text-zinc-300"}`}>
                    {label}
                    <span className={`text-xs ${ativo ? "text-amber-400" : "text-zinc-700"}`}>
                      {ativo ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
                    </span>
                  </button>
                )
              }
              return (
                <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-700 bg-zinc-900/60">
                  <div className="w-9 flex-shrink-0" />
                  <Th col="nome" label="Produto" className="w-44 flex-shrink-0 justify-start" />
                  <Th col="vendas" label="Vendas" className="w-20 flex-shrink-0" />
                  <Th col="precoMin" label="Mín" className="w-20 flex-shrink-0" />
                  <Th col="preco" label="Atual" className="w-20 flex-shrink-0" />
                  <Th col="precoMax" label="Máx" className="w-20 flex-shrink-0" />
                  <Th col="estoque" label="Estoque" className="w-20 flex-shrink-0" />
                  <Th col="inclusao" label="Inclusão" className="w-20 flex-shrink-0" />
                  <Th col="compra" label="Ult. compra" className="w-20 flex-shrink-0" />
                  <Th col="venda" label="Ult. venda" className="w-20 flex-shrink-0" />
                  <Th col="dia" label="Dia top" className="w-16 flex-shrink-0" />
                  <Th col="hora" label="Hora top" className="w-16 flex-shrink-0" />
                </div>
              )
            })()}

            {/* Linhas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {sortarItens(itensCatalogo, false).map(p => {
                const dbProd = produtos.find(prod => prod.name === p.name)
                return <LinhaItem key={p.name} cat={p} dbProd={dbProd} onEditar={dbProd ? () => abrirEditar(dbProd) : () => editarItemCatalogo(p)} />
              })}
              {sortarItens(itensMeus, true).map(p => (
                <LinhaItem key={p.id} dbProd={p} onEditar={() => abrirEditar(p)} />
              ))}
              {itensCatalogo.length === 0 && itensMeus.length === 0 && (
                <div className="py-8 text-center text-zinc-600 text-sm">Nenhum produto neste grupo</div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ABA PDV */}
      {aba === "pdv" && (
        <div>
          {/* Filtro de data */}
          <div className="flex items-center gap-3 mb-4">
            <input type="date" value={filtroDataVendas}
              onChange={(e) => { setFiltroDataVendas(e.target.value); buscarVendas(e.target.value) }}
              className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-amber-500 transition-colors" />
            <button onClick={() => { setFiltroDataVendas(""); buscarVendas("") }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!filtroDataVendas ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"}`}>
              Todas
            </button>
            <button onClick={() => buscarVendas(filtroDataVendas)}
              className="text-xs px-3 py-1.5 rounded-lg border bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600 transition-colors">
              ↻ Atualizar
            </button>
            {!loadingVendas && vendas.length > 0 && (
              <div className="flex gap-4 text-sm ml-auto">
                <span className="text-zinc-500">{vendas.length} venda{vendas.length !== 1 ? "s" : ""}</span>
                <span className="text-green-400 font-bold">
                  R$ {vendas.reduce((s: number, v: any) => s + ((v.unitPrice ?? v.product?.salePrice ?? 0) * v.quantity), 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {erroVendas && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-3 text-red-400 text-sm">
              Erro ao carregar: {erroVendas}
            </div>
          )}

          {loadingVendas ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">Carregando...</div>
          ) : vendas.length === 0 && !erroVendas ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">🛒</div>
              <div className="text-zinc-500 text-sm">
                {filtroDataVendas ? "Nenhuma venda registrada nesta data" : "Nenhuma venda registrada"}
              </div>
              <button onClick={() => { setFiltroDataVendas(""); buscarVendas("") }}
                className="mt-3 text-amber-400 text-xs hover:text-amber-300">
                Ver todas as vendas →
              </button>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Hora</th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Produto</th>
                    <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                    <th className="text-center px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Qtd</th>
                    <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Unit.</th>
                    <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((v: any, i: number) => {
                    const cliente = v.reason?.replace(/^Venda — /, "").replace(/^Venda balcão$/, "Balcão") || "Balcão"
                    const preco = v.unitPrice ?? v.product?.salePrice ?? 0
                    const totalLinha = preco * v.quantity
                    const descPct = v.unitPrice && v.product?.salePrice && v.unitPrice < v.product.salePrice
                      ? ((1 - v.unitPrice / v.product.salePrice) * 100).toFixed(0)
                      : null
                    return (
                      <tr key={v.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === vendas.length - 1 ? "border-0" : ""}`}>
                        <td className="px-4 py-3 text-zinc-500 text-xs font-mono whitespace-nowrap">
                          {new Date(v.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {vendas.length > 1 && filtroDataVendas === "" && (
                            <div className="text-zinc-700 text-xs">{new Date(v.createdAt).toLocaleDateString("pt-BR")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{v.product?.name || "—"}</td>
                        <td className="px-4 py-3 text-zinc-400 text-sm">{cliente}</td>
                        <td className="px-4 py-3 text-center text-zinc-300 text-sm">{v.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-amber-400 text-sm font-mono">R$ {preco.toFixed(2)}</div>
                          {descPct && <div className="text-orange-400 text-xs">{descPct}% desc</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold font-mono">
                          R$ {totalLinha.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t border-zinc-700">
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-zinc-500 text-xs text-right">Total do dia</td>
                    <td className="px-4 py-2 text-right text-green-400 font-bold font-mono">
                      R$ {vendas.reduce((s: number, v: any) => s + ((v.unitPrice ?? v.product?.salePrice ?? 0) * v.quantity), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
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

      {/* MODAL ENTRADA DE MERCADORIA */}
      {modalEntrada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 flex-shrink-0">
              <h2 className="text-white font-bold">Entrada de Mercadoria</h2>
              <button onClick={fecharModalEntrada} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-zinc-800 flex-shrink-0">
              {(["simples","estratificada"] as const).map(t => (
                <button key={t} onClick={() => setTipoEntrada(t)}
                  className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
                    tipoEntrada === t ? "text-amber-400 border-b-2 border-amber-500" : "text-zinc-500 hover:text-zinc-300"
                  }`}>
                  {t === "simples" ? "Simples" : "Estratificada (NF-e)"}
                </button>
              ))}
            </div>

            <form onSubmit={confirmarEntrada} className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── ABA SIMPLES ── */}
              {tipoEntrada === "simples" && (
                <>
                  {/* Busca de produto */}
                  <div className="relative">
                    <label className="text-zinc-400 text-xs mb-1 block">Adicionar produto</label>
                    <input value={buscaEntrada}
                      onChange={e => { setBuscaEntrada(e.target.value); setDropdownEntrada(true) }}
                      onFocus={() => setDropdownEntrada(true)}
                      placeholder="Buscar no catálogo..." className={inputCls} />
                    {dropdownEntrada && buscaEntrada.trim().length > 1 && (() => {
                      const res = produtos.filter(p => p.name.toLowerCase().includes(buscaEntrada.toLowerCase()))
                      return (
                        <div className="absolute top-full mt-1 left-0 right-0 z-10 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                          {res.length > 0 ? res.map(p => (
                            <button key={p.id} type="button"
                              onClick={() => {
                                const novo = { id: crypto.randomUUID(), produto: p, qty: "1", custo: String(p.costPrice ?? "") }
                                setItensEntrada(prev => [...prev, novo])
                                setBuscaEntrada(""); setDropdownEntrada(false)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700/50 last:border-0 transition-colors">
                              <div className="text-white text-sm">{p.name}</div>
                              <div className="text-zinc-500 text-xs">Estoque: {p.stock} · Custo: R$ {p.costPrice?.toFixed(2)}</div>
                            </button>
                          )) : (
                            <div className="px-3 py-2 text-zinc-500 text-sm">Nenhum produto encontrado</div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Lista de itens */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-zinc-400 text-xs uppercase tracking-wider">Itens da entrada</div>
                      <button type="button"
                        onClick={() => setItensEntrada(prev => [...prev, { id: crypto.randomUUID(), produto: null as any, qty: "1", custo: "" }])}
                        className="text-amber-400 hover:text-amber-300 text-xs transition-colors">+ Adicionar item</button>
                    </div>

                    {itensEntrada.length === 0 && (
                      <div className="bg-zinc-800/50 border border-dashed border-zinc-700 rounded-lg p-4 text-center text-zinc-600 text-xs">
                        Busque um produto acima ou clique em "+ Adicionar item"
                      </div>
                    )}

                    <div className="space-y-3">
                      {itensEntrada.map((item, i) => (
                        <div key={item.id} className="bg-zinc-800 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 text-xs">Item {i + 1}</span>
                            <button type="button" onClick={() => setItensEntrada(prev => prev.filter(x => x.id !== item.id))}
                              className="text-zinc-600 hover:text-red-400 text-xs transition-colors">remover</button>
                          </div>
                          <div>
                            <label className="text-zinc-500 text-xs mb-0.5 block">Produto *</label>
                            <select value={item.produto?.id ?? ""}
                              onChange={e => {
                                const p = produtos.find(x => x.id === e.target.value) ?? null
                                setItensEntrada(prev => prev.map((x,j) => j===i ? {...x, produto: p, custo: p ? String(p.costPrice ?? "") : x.custo} : x))
                              }}
                              className={inputCls}>
                              <option value="">— selecione —</option>
                              {produtos.filter(p => p.isActive).map(p => (
                                <option key={p.id} value={p.id}>{p.name} (estoque: {p.stock})</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-zinc-500 text-xs mb-0.5 block">Qtd *</label>
                              <input type="number" min="1" value={item.qty}
                                onChange={e => setItensEntrada(prev => prev.map((x,j) => j===i ? {...x, qty: e.target.value} : x))}
                                className={inputCls} />
                            </div>
                            <div>
                              <label className="text-zinc-500 text-xs mb-0.5 block">Preço de custo (R$)</label>
                              <input type="number" min="0" step="0.01" value={item.custo}
                                placeholder={item.produto?.costPrice?.toFixed(2) ?? "0.00"}
                                onChange={e => setItensEntrada(prev => prev.map((x,j) => j===i ? {...x, custo: e.target.value} : x))}
                                className={inputCls} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── ABA ESTRATIFICADA ── */}
              {tipoEntrada === "estratificada" && (
                <>
                  {/* Upload XML — opção principal gratuita */}
                  <div className="bg-zinc-800/60 border border-dashed border-zinc-600 rounded-xl p-4">
                    <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">📄 Upload do XML da NF-e</div>
                    <p className="text-zinc-500 text-xs mb-3">O fornecedor envia o arquivo <span className="text-white">.xml</span> junto com a nota. Faça o upload para preencher os itens automaticamente.</p>
                    <label className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${buscandoNfe ? "opacity-50 cursor-not-allowed bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"}`}>
                      {buscandoNfe ? "Processando..." : "Selecionar arquivo XML"}
                      <input type="file" accept=".xml,text/xml,application/xml" className="hidden" disabled={buscandoNfe}
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setBuscandoNfe(true); setErroNfe(""); setDadosNfe(null); setItensNfe([])
                          try {
                            const fd = new FormData()
                            fd.append("xml", file)
                            const res = await fetch("/api/estoque/nfe/xml", { method: "POST", body: fd })
                            const data = await res.json()
                            if (!res.ok) { setErroNfe(data.error || "Erro ao processar XML"); return }
                            setDadosNfe(data)
                            setChaveNfe(data.chave ?? "")
                            setItensNfe((data.itens ?? []).map((it: any) => ({
                              desc: it.descricao,
                              qty: String(it.quantidade),
                              custo: it.valorUnitario > 0 ? String(it.valorUnitario.toFixed(2)) : "",
                              produto: null,
                            })))
                          } catch (err) { setErroNfe(String(err)) }
                          finally { setBuscandoNfe(false); e.target.value = "" }
                        }} />
                    </label>
                  </div>

                  {/* Separador */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-zinc-600 text-xs">ou consulte pela chave</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  {/* Chave de acesso */}
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Chave de Acesso NF-e (44 dígitos)</label>
                    <div className="flex gap-2">
                      <input value={chaveNfe}
                        onChange={e => setChaveNfe(e.target.value.replace(/\D/g,"").slice(0,44))}
                        placeholder="00000000000000000000000000000000000000000000"
                        maxLength={44}
                        className={`${inputCls} font-mono text-xs tracking-wider flex-1`} />
                      <button type="button" onClick={buscarNfe} disabled={buscandoNfe || chaveNfe.length < 44}
                        className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-300 font-semibold px-4 rounded-lg text-sm transition-colors flex-shrink-0">
                        {buscandoNfe ? "..." : "Consultar"}
                      </button>
                    </div>
                    <div className="text-zinc-600 text-xs mt-1">{chaveNfe.length}/44 dígitos · extrai dados básicos da chave</div>
                  </div>

                  {erroNfe && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erroNfe}</div>
                  )}

                  {/* Dados da NF-e */}
                  {dadosNfe && (
                    <>
                      <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
                        <div className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-2">{dadosNfe.modelo} · {dadosNfe.estado}</div>
                        <div className="grid grid-cols-2 gap-x-4 text-xs">
                          <div><span className="text-zinc-500">Emitente:</span> <span className="text-white font-mono">{dadosNfe.cnpjEmitente}</span></div>
                          <div><span className="text-zinc-500">Emissão:</span> <span className="text-white">{dadosNfe.emissao}</span></div>
                          <div><span className="text-zinc-500">Número:</span> <span className="text-white">{dadosNfe.numero}</span></div>
                          <div><span className="text-zinc-500">Série:</span> <span className="text-white">{dadosNfe.serie}</span></div>
                        </div>
                        {dadosNfe.aviso && (
                          <div className="text-amber-500/70 text-[10px] mt-2 leading-relaxed">{dadosNfe.aviso}</div>
                        )}
                      </div>

                      {/* Itens da NF-e */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-zinc-400 text-xs uppercase tracking-wider">Itens da nota</div>
                          <button type="button" onClick={() => setItensNfe(prev => [...prev, { desc: "", qty: "1", custo: "", produto: null }])}
                            className="text-amber-400 hover:text-amber-300 text-xs transition-colors">+ Adicionar item</button>
                        </div>

                        {itensNfe.length === 0 && (
                          <div className="bg-zinc-800/50 border border-dashed border-zinc-700 rounded-lg p-4 text-center text-zinc-600 text-xs">
                            Nenhum item retornado automaticamente — adicione manualmente
                          </div>
                        )}

                        <div className="space-y-3">
                          {itensNfe.map((item, i) => (
                            <div key={i} className="bg-zinc-800 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400 text-xs">Item {i + 1}</span>
                                <button type="button" onClick={() => setItensNfe(prev => prev.filter((_,j) => j !== i))}
                                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors">remover</button>
                              </div>
                              {item.desc && <div className="text-white text-xs font-medium">{item.desc}</div>}
                              {/* Vincular ao catálogo */}
                              <div>
                                <label className="text-zinc-500 text-xs mb-0.5 block">Produto no catálogo *</label>
                                <select value={item.produto?.id ?? ""}
                                  onChange={e => {
                                    const p = produtos.find(x => x.id === e.target.value) ?? null
                                    setItensNfe(prev => prev.map((x,j) => j===i ? {...x, produto: p} : x))
                                  }}
                                  className={inputCls}>
                                  <option value="">— selecione —</option>
                                  {produtos.filter(p => p.isActive).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-zinc-500 text-xs mb-0.5 block">Qtd *</label>
                                  <input type="number" min="1" value={item.qty}
                                    onChange={e => setItensNfe(prev => prev.map((x,j) => j===i ? {...x, qty: e.target.value} : x))}
                                    className={inputCls} />
                                </div>
                                <div>
                                  <label className="text-zinc-500 text-xs mb-0.5 block">Preço de custo NF-e (R$)</label>
                                  <input type="number" min="0" step="0.01" value={item.custo}
                                    onChange={e => setItensNfe(prev => prev.map((x,j) => j===i ? {...x, custo: e.target.value} : x))}
                                    className={inputCls} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Motivo — comum às duas abas */}
              {(tipoEntrada === "simples" ? itensEntrada.length > 0 : dadosNfe !== null) && (
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Motivo / Observação</label>
                  <input value={motivoEntrada} onChange={e => setMotivoEntrada(e.target.value)}
                    placeholder={tipoEntrada === "estratificada" && dadosNfe ? `NF-e ${dadosNfe.numero}` : "Ex: Compra do fornecedor..."}
                    className={inputCls} />
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-1 flex-shrink-0">
                <button type="button" onClick={fecharModalEntrada}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoEntrada ||
                  (tipoEntrada === "simples" && itensEntrada.length === 0) ||
                  (tipoEntrada === "estratificada" && (!dadosNfe || itensNfe.filter(i => i.produto).length === 0))}
                  className="flex-1 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-40 text-green-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-green-500/20 transition-colors">
                  {salvandoEntrada ? "Salvando..." : `Confirmar ${tipoEntrada === "simples" ? itensEntrada.length : itensNfe.filter(i=>i.produto).length} item(ns)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </DashboardLayout>
  )
}
