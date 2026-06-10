"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoCaixa = "RECEITA" | "CUSTO" | "DESPESA"

type Categoria = {
  label: string
  tipo: TipoCaixa
}

type GrupoCategoria = {
  grupo: string
  cor: string       // classe Tailwind para o badge
  categorias: Categoria[]
}

// ─── Categorias de saída ──────────────────────────────────────────────────────

const GRUPOS_SAIDA: GrupoCategoria[] = [
  {
    grupo: "Pessoal",
    cor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    categorias: [
      { label: "Adiantamento para funcionário", tipo: "CUSTO" },
      { label: "Pagamento de salário",          tipo: "CUSTO" },
      { label: "Comissão",                      tipo: "CUSTO" },
      { label: "Férias / 13º salário",          tipo: "CUSTO" },
    ],
  },
  {
    grupo: "Fornecedores",
    cor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    categorias: [
      { label: "Compra de produtos",            tipo: "CUSTO" },
      { label: "Material de limpeza",           tipo: "CUSTO" },
      { label: "Equipamentos / Ferramentas",    tipo: "CUSTO" },
    ],
  },
  {
    grupo: "Contas",
    cor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    categorias: [
      { label: "Aluguel",                       tipo: "DESPESA" },
      { label: "Água / Luz / Gás",              tipo: "DESPESA" },
      { label: "Internet / Telefone",           tipo: "DESPESA" },
      { label: "Software / Sistema",            tipo: "DESPESA" },
    ],
  },
  {
    grupo: "Outros",
    cor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    categorias: [
      { label: "Marketing / Publicidade",       tipo: "DESPESA" },
      { label: "Impostos / Taxas",              tipo: "DESPESA" },
      { label: "Manutenção",                    tipo: "DESPESA" },
      { label: "Outros",                        tipo: "DESPESA" },
    ],
  },
]

const TIPO_BADGE: Record<TipoCaixa, string> = {
  CUSTO:   "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  DESPESA: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  RECEITA: "bg-green-500/10 text-green-400 border border-green-500/20",
}

const TIPO_LABEL: Record<TipoCaixa, string> = {
  CUSTO:   "Custo",
  DESPESA: "Despesa",
  RECEITA: "Receita",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METODOS = ["PIX", "DINHEIRO", "CARTAO", "OUTRO"]
const METODO_LABEL: Record<string, string> = {
  PIX: "PIX", DINHEIRO: "Dinheiro", CARTAO: "Cartão", OUTRO: "Outro",
}

const ic = (path: string, cls = "w-4 h-4 flex-shrink-0") => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
)

const ICON_AGENDA     = "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
const ICON_VENDA      = "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
const ICON_PRODUTO    = "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
const ICON_MERCADORIA = "M3 7h18M3 12h18m-9-9v18"
const ICON_MAIS_CIRC  = "M12 4v16m-8-8h16"
const ICON_MENOS      = "M20 12H4"
const ICON_VOLTAR     = "M15 19l-7-7 7-7"

// ─── Modal de lançamento ──────────────────────────────────────────────────────

type Profissional = { id: string; name: string }
type CategoriaCustom = { id: string; nome: string; tipo: "CUSTO" | "DESPESA" }

function ModalCaixa({
  modoInicial,
  categoriasCustom,
  onClose,
}: {
  modoInicial: "ENTRADA" | "SAIDA"
  categoriasCustom: CategoriaCustom[]
  onClose: () => void
}) {
  const [etapa, setEtapa] = useState<"categoria" | "form">(modoInicial === "SAIDA" ? "categoria" : "form")
  const [categoriaEscolhida, setCategoriaEscolhida] = useState<Categoria | null>(null)
  const [grupoEscolhido, setGrupoEscolhido] = useState<string | null>(null)

  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [metodo, setMetodo] = useState("DINHEIRO")
  const [colaboradorId, setColaboradorId] = useState("")
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (etapa === "form") inputRef.current?.focus() }, [etapa])

  useEffect(() => {
    if (modoInicial === "SAIDA" && profissionais.length === 0) {
      fetch("/api/equipe")
        .then(r => r.json())
        .then((data: Profissional[]) => { if (Array.isArray(data)) setProfissionais(data) })
        .catch(() => {})
    }
  }, [modoInicial])

  function selecionarCategoria(cat: Categoria, grupo: string) {
    setCategoriaEscolhida(cat)
    setGrupoEscolhido(grupo)
    setDescricao(cat.label)
    setEtapa("form")
  }

  const tipoLancamento: TipoCaixa = modoInicial === "ENTRADA" ? "RECEITA" : (categoriaEscolhida?.tipo ?? "DESPESA")
  const isEntrada = modoInicial === "ENTRADA"

  async function handleSalvar() {
    const v = parseFloat(valor.replace(",", "."))
    if (!v || v <= 0) { setErro("Informe um valor válido."); return }
    if (!descricao.trim()) { setErro("Informe uma descrição."); return }

    const profNome = profissionais.find(p => p.id === colaboradorId)?.name
    const descricaoFinal = profNome ? `${descricao.trim()} — ${profNome}` : descricao.trim()

    setSalvando(true); setErro(null)
    try {
      const res = await fetch("/api/caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lancar",
          tipo: tipoLancamento,
          valor: v,
          descricao: descricaoFinal,
          metodo,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? "Erro ao lançar"); return }
      setOk(true)
      window.dispatchEvent(new CustomEvent("caixaAtualizado"))
      setTimeout(onClose, 1200)
    } catch (e) {
      setErro(String(e))
    } finally {
      setSalvando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && etapa === "form" && !salvando) handleSalvar()
    if (e.key === "Escape") onClose()
  }

  const headerCor = isEntrada ? "bg-green-500/10" : "bg-red-500/10"
  const iconCor   = isEntrada ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
  const tituloLabel = isEntrada ? "Entrada de dinheiro" : "Saída de dinheiro"

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-zinc-800 rounded-t-2xl flex-shrink-0 ${headerCor}`}>
          <div className="flex items-center gap-2">
            {etapa === "form" && !isEntrada && (
              <button onClick={() => setEtapa("categoria")} className="text-zinc-500 hover:text-zinc-300 mr-1 transition-colors">
                {ic(ICON_VOLTAR)}
              </button>
            )}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconCor}`}>
              {ic(isEntrada ? ICON_MAIS_CIRC : ICON_MENOS)}
            </div>
            <div>
              <span className={`font-semibold text-sm block ${isEntrada ? "text-green-400" : "text-red-400"}`}>
                {tituloLabel}
              </span>
              {etapa === "form" && categoriaEscolhida && (
                <span className={`text-xs px-1.5 py-0.5 rounded border ${TIPO_BADGE[tipoLancamento]}`}>
                  {TIPO_LABEL[tipoLancamento]}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none">✕</button>
        </div>

        {/* ── Etapa 1: Escolher categoria (só para saída) ── */}
        {etapa === "categoria" && (
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {GRUPOS_SAIDA.map(grupo => (
              <div key={grupo.grupo}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${grupo.cor}`}>
                    {grupo.grupo}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {grupo.categorias.map(cat => (
                    <button key={cat.label} onClick={() => selecionarCategoria(cat, grupo.grupo)}
                      className="flex flex-col items-start gap-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 rounded-xl px-3 py-2.5 text-left transition-all group">
                      <span className="text-white text-xs font-medium leading-tight">{cat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TIPO_BADGE[cat.tipo]}`}>
                        {TIPO_LABEL[cat.tipo]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Categorias customizadas */}
            {categoriasCustom.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                    Personalizadas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {categoriasCustom.map(cat => (
                    <button key={cat.id} onClick={() => selecionarCategoria({ label: cat.nome, tipo: cat.tipo }, "Custom")}
                      className="flex flex-col items-start gap-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 rounded-xl px-3 py-2.5 text-left transition-all">
                      <span className="text-white text-xs font-medium leading-tight">{cat.nome}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TIPO_BADGE[cat.tipo]}`}>
                        {TIPO_LABEL[cat.tipo]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opção livre */}
            <button onClick={() => { setCategoriaEscolhida({ label: "", tipo: "DESPESA" }); setGrupoEscolhido(null); setEtapa("form") }}
              className="w-full flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 border border-dashed border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-500 hover:text-zinc-300 text-xs transition-all">
              {ic("M12 4v16m-8-8h16")} Outro (digitar manualmente)
            </button>
          </div>
        )}

        {/* ── Etapa 2: Formulário ── */}
        {etapa === "form" && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Valor */}
            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Valor (R$) *</label>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={e => setValor(e.target.value.replace(/[^0-9,.]/g, ""))}
                placeholder="0,00"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-lg font-bold outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Descrição *</label>
              <input
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder={isEntrada ? "Ex: Depósito, Troco..." : "Detalhe o lançamento..."}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
              />
            </div>

            {/* Colaborador (para qualquer saída) */}
            {!isEntrada && profissionais.length > 0 && (
              <div>
                <label className="text-zinc-400 text-xs mb-1.5 block">Colaborador <span className="text-zinc-600">(opcional)</span></label>
                <select
                  value={colaboradorId}
                  onChange={e => setColaboradorId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">— Nenhum —</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Método */}
            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Forma de pagamento</label>
              <div className="flex gap-2 flex-wrap">
                {METODOS.map(m => (
                  <button key={m} type="button" onClick={() => setMetodo(m)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${metodo === m ? "bg-amber-500 text-black border-amber-500 font-semibold" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
                    {METODO_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>

            {erro && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{erro}</div>}

            {ok && (
              <div className={`text-xs px-3 py-2 rounded-lg border ${isEntrada ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
                ✓ Lançamento registrado no caixa!
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={salvando || ok}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${isEntrada ? "bg-green-500 hover:bg-green-400 text-black" : "bg-red-500 hover:bg-red-400 text-white"}`}>
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FAB principal ────────────────────────────────────────────────────────────

type FABOption = {
  label: string
  icon: string
  color?: string
  onClick: () => void
}

export default function GlobalFAB() {
  const router = useRouter()
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [modalCaixa, setModalCaixa] = useState<"ENTRADA" | "SAIDA" | null>(null)
  const [categoriasCustom, setCategoriasCustom] = useState<CategoriaCustom[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/caixa/categorias")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.categorias)) setCategoriasCustom(d.categorias) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") setAberto(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  function despachar(evento: string) {
    setAberto(false)
    window.dispatchEvent(new CustomEvent(evento))
  }

  function irParaEstoque(param: string) {
    setAberto(false)
    if (pathname === "/dashboard/estoque") {
      window.dispatchEvent(new CustomEvent(param))
    } else {
      router.push(`/dashboard/estoque?abrir=${param}`)
    }
  }

  function abrirCaixa(modo: "ENTRADA" | "SAIDA") {
    setAberto(false)
    setModalCaixa(modo)
  }

  const opcoes: FABOption[] = [
    { label: "Agendamento",          icon: ICON_AGENDA,     onClick: () => despachar("abrirModalAgenda") },
    { label: "Venda / PDV",          icon: ICON_VENDA,      onClick: () => despachar("abrirVenda") },
    { label: "Novo Produto",         icon: ICON_PRODUTO,    onClick: () => irParaEstoque("abrirNovoProduto") },
    { label: "Entrada de Mercadoria",icon: ICON_MERCADORIA, onClick: () => irParaEstoque("abrirEntradaMercadoria") },
    { label: "Entrada de dinheiro",  icon: ICON_MAIS_CIRC,  color: "text-green-400", onClick: () => abrirCaixa("ENTRADA") },
    { label: "Saída de dinheiro",    icon: ICON_MENOS,      color: "text-red-400",   onClick: () => abrirCaixa("SAIDA") },
  ]

  return (
    <>
      {modalCaixa && (
        <ModalCaixa
          modoInicial={modalCaixa}
          categoriasCustom={categoriasCustom}
          onClose={() => setModalCaixa(null)}
        />
      )}

      <div ref={ref} className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2">
        {aberto && (
          <div className="flex flex-col items-end gap-1.5 mb-1">
            {opcoes.map(op => (
              <button key={op.label} onClick={op.onClick}
                className={`flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-sm font-medium px-4 py-2.5 rounded-full shadow-xl transition-all whitespace-nowrap ${op.color ?? "text-white"}`}>
                {ic(op.icon)}
                {op.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setAberto(prev => !prev)}
          className={`w-14 h-14 rounded-full shadow-xl text-2xl font-bold transition-all duration-200 ${
            aberto
              ? "bg-zinc-700 text-white rotate-45 scale-95"
              : "bg-amber-500 hover:bg-amber-400 text-black hover:scale-105"
          }`}
          aria-label="Ações rápidas">
          +
        </button>
      </div>
    </>
  )
}
