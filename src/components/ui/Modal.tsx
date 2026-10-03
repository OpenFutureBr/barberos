"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/cn"

const LARGURAS = {
  sm: "md:max-w-sm",
  md: "md:max-w-lg",
  lg: "md:max-w-2xl",
  xl: "md:max-w-4xl",
} as const

// Modais abertos, do mais antigo ao mais novo. Com um aberto por cima de outro
// (a confirmacao do useConfirmar nasce de dentro de modais), o Escape fecha so
// o de cima — cada um escuta o document e, sem isso, fechavam os dois juntos.
const pilha: object[] = []

/**
 * Dialogo centralizado no desktop e folha de tela cheia no mobile — os modais
 * atuais do projeto usam a mesma caixa nos dois, o que no celular corta
 * conteudo e deixa os botoes de acao fora do alcance.
 *
 * - rolagem interna no corpo, cabecalho e rodape fixos;
 * - rodape respeita a safe area (barra de gestos do iOS);
 * - fecha no Escape e no clique no fundo (`fecharNoFundo={false}` desliga o
 *   clique — para formularios longos, onde um clique fora perderia o que foi
 *   digitado);
 * - trava a rolagem do body enquanto aberto.
 *
 * Nao implementa focus trap: para formularios longos isso exigiria varrer os
 * focaveis a cada render. O foco inicial vai para o painel, o que ja evita
 * que o teclado continue na pagina de tras.
 */
export default function Modal({
  aberto, onFechar, titulo, subtitulo, rodape, tamanho = "md", fecharNoFundo = true, className, children,
}: {
  aberto: boolean
  fecharNoFundo?: boolean
  onFechar: () => void
  titulo?: React.ReactNode
  subtitulo?: React.ReactNode
  rodape?: React.ReactNode
  tamanho?: keyof typeof LARGURAS
  className?: string
  children: React.ReactNode
}) {
  const painelRef = useRef<HTMLDivElement>(null)
  // onFechar costuma vir inline (`onFechar={() => setX(null)}`): fora das
  // dependencias, para o efeito nao rodar de novo a cada render — o que
  // reempilharia este modal por cima de um aberto depois dele.
  const onFecharRef = useRef(onFechar)
  useEffect(() => { onFecharRef.current = onFechar })

  useEffect(() => {
    if (!aberto) return

    const eu = {}
    pilha.push(eu)

    function onTecla(e: KeyboardEvent) {
      // defaultPrevented: um campo de dentro ja usou o Esc (fechar a lista de
      // um autocomplete, por ex.). stopPropagation nao serve para isso — no
      // App Router o React escuta no proprio document, o mesmo no daqui.
      if (e.key === "Escape" && !e.defaultPrevented && pilha[pilha.length - 1] === eu) onFecharRef.current()
    }
    document.addEventListener("keydown", onTecla)

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Respeita um autoFocus de dentro (este efeito roda depois dos filhos).
    if (!painelRef.current?.contains(document.activeElement)) painelRef.current?.focus()

    return () => {
      pilha.splice(pilha.indexOf(eu), 1)
      document.removeEventListener("keydown", onTecla)
      document.body.style.overflow = overflowAnterior
    }
  }, [aberto])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        onClick={fecharNoFundo ? onFechar : undefined}
        aria-hidden
      />

      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "relative flex flex-col bg-surface-1 outline-none",
          // mobile: folha de tela cheia; desktop: caixa com cantos suaves
          "w-full h-full md:h-auto md:max-h-[85vh] md:rounded-2xl md:border md:border-line md:shadow-2xl md:shadow-black/40",
          LARGURAS[tamanho],
          className
        )}
      >
        {(titulo || subtitulo) && (
          <div
            className="flex items-start justify-between gap-3 px-4 py-3 border-b border-line flex-shrink-0"
            style={{ paddingTop: "max(0.75rem, var(--sa-top))" }}
          >
            <div className="min-w-0">
              {/* Texto vira <h2>; outro conteudo (abas, por ex.) vai como esta. */}
              {typeof titulo === "string"
                ? <h2 className="text-fg text-sm font-semibold truncate">{titulo}</h2>
                : titulo}
              {subtitulo && <p className="text-fg-3 text-xs mt-0.5">{subtitulo}</p>}
            </div>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="text-fg-3 hover:text-fg w-9 h-9 -mr-1.5 -mt-1 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {rodape && (
          <div
            className="px-4 py-3 border-t border-line flex items-center justify-end gap-2 flex-shrink-0"
            style={{ paddingBottom: "max(0.75rem, var(--sa-bottom))" }}
          >
            {rodape}
          </div>
        )}
      </div>
    </div>
  )
}
