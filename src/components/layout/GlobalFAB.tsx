"use client"

import { useState, useEffect, useRef } from "react"

type TipoCaixa = "RECEITA" | "DESPESA"

const METODOS = ["PIX", "DINHEIRO", "CARTAO", "OUTRO"]
const METODO_LABEL: Record<string, string> = { PIX: "PIX", DINHEIRO: "Dinheiro", CARTAO: "Cartão", OUTRO: "Outro" }

// ─── Ícones inline ───────────────────────────────────────────────────────────

const ic = (path: string) => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
)

const ICON_AGENDA    = "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
const ICON_VENDA     = "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
const ICON_PRODUTO   = "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
const ICON_MERCADORIA = "M3 7h18M3 12h18m-9-9v18"
const ICON_ENTRADA   = "M12 4v16m-8-8h16"
const ICON_SAIDA     = "M20 12H4"

// ─── Modal de lançamento de caixa ────────────────────────────────────────────

function ModalCaixa({ tipo, onClose }: { tipo: TipoCaixa; onClose: () => void }) {
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [metodo, setMetodo] = useState("DINHEIRO")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSalvar() {
    const v = parseFloat(valor.replace(",", "."))
    if (!v || v <= 0) { setErro("Informe um valor válido."); return }
    if (!descricao.trim()) { setErro("Informe uma descrição."); return }
    setSalvando(true); setErro(null)
    try {
      const res = await fetch("/api/caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lancar", tipo, valor: v, descricao: descricao.trim(), metodo }),
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
    if (e.key === "Enter" && !salvando) handleSalvar()
    if (e.key === "Escape") onClose()
  }

  const isEntrada = tipo === "RECEITA"

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-zinc-800 rounded-t-2xl ${isEntrada ? "bg-green-500/10" : "bg-red-500/10"}`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isEntrada ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {ic(isEntrada ? ICON_ENTRADA : ICON_SAIDA)}
            </div>
            <span className={`font-semibold text-sm ${isEntrada ? "text-green-400" : "text-red-400"}`}>
              {isEntrada ? "Entrada de dinheiro" : "Saída de dinheiro"}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
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
              placeholder={isEntrada ? "Ex: Troco recebido, Depósito..." : "Ex: Aluguel, Material de limpeza..."}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

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
  const [aberto, setAberto] = useState(false)
  const [modalCaixa, setModalCaixa] = useState<TipoCaixa | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fecha ao pressionar Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") setAberto(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  function despachar(evento: string) {
    setAberto(false)
    window.dispatchEvent(new CustomEvent(evento))
  }

  function abrirCaixa(tipo: TipoCaixa) {
    setAberto(false)
    setModalCaixa(tipo)
  }

  const opcoes: FABOption[] = [
    {
      label: "Agendamento",
      icon: ICON_AGENDA,
      onClick: () => despachar("abrirModalAgenda"),
    },
    {
      label: "Venda / PDV",
      icon: ICON_VENDA,
      onClick: () => despachar("abrirVenda"),
    },
    {
      label: "Novo Produto",
      icon: ICON_PRODUTO,
      onClick: () => despachar("abrirNovoProduto"),
    },
    {
      label: "Entrada de Mercadoria",
      icon: ICON_MERCADORIA,
      onClick: () => despachar("abrirEntradaMercadoria"),
    },
    {
      label: "Entrada de dinheiro",
      icon: ICON_ENTRADA,
      color: "text-green-400",
      onClick: () => abrirCaixa("RECEITA"),
    },
    {
      label: "Saída de dinheiro",
      icon: ICON_SAIDA,
      color: "text-red-400",
      onClick: () => abrirCaixa("DESPESA"),
    },
  ]

  return (
    <>
      {modalCaixa && (
        <ModalCaixa tipo={modalCaixa} onClose={() => setModalCaixa(null)} />
      )}

      <div ref={ref} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {/* Menu de opções */}
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

        {/* Botão principal */}
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
