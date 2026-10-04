"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/cn"
import Modal from "./Modal"
import Button from "./Button"

// Substitui window.confirm/alert: os nativos travam a aba, ignoram o tema, no
// PWA do iOS aparecem com o endereço do site no titulo e nao dao para estilizar
// uma acao destrutiva como destrutiva.
//
//   const confirmar = useConfirmar()
//   if (!(await confirmar({ titulo: "Excluir produto?", confirmar: "Excluir", perigo: true }))) return
//
//   const avisar = useAviso()
//   avisar("API Key copiada!", "sucesso")

type OpcoesConfirmar = {
  titulo: React.ReactNode
  mensagem?: React.ReactNode
  confirmar?: string
  cancelar?: string
  perigo?: boolean
}

type TipoAviso = "info" | "sucesso" | "erro"
type Aviso = { id: number; texto: React.ReactNode; tipo: TipoAviso }

type Contexto = {
  confirmar: (o: OpcoesConfirmar) => Promise<boolean>
  avisar: (texto: React.ReactNode, tipo?: TipoAviso) => void
}

const AvisosContext = createContext<Contexto | null>(null)

function usarContexto() {
  const ctx = useContext(AvisosContext)
  if (!ctx) throw new Error("useConfirmar/useAviso precisam do <AvisosProvider> (montado no layout raiz)")
  return ctx
}

export const useConfirmar = () => usarContexto().confirmar
export const useAviso = () => usarContexto().avisar

const TEMPO_AVISO: Record<TipoAviso, number> = { info: 4000, sucesso: 3000, erro: 6000 }

const ESTILO_AVISO: Record<TipoAviso, string> = {
  info:    "border-line text-fg",
  sucesso: "border-green-500/30 text-green-400",
  erro:    "border-red-500/30 text-red-400",
}

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<OpcoesConfirmar | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const proximoId = useRef(0)

  const confirmar = useCallback((o: OpcoesConfirmar) => {
    // Um segundo pedido com o primeiro ainda aberto conta o primeiro como
    // cancelado, em vez de deixar a promise dele pendurada para sempre.
    resolver.current?.(false)
    setPedido(o)
    return new Promise<boolean>(res => { resolver.current = res })
  }, [])

  const responder = useCallback((v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setPedido(null)
  }, [])
  const cancelar = useCallback(() => responder(false), [responder])

  const remover = useCallback((id: number) => setAvisos(a => a.filter(x => x.id !== id)), [])

  const avisar = useCallback((texto: React.ReactNode, tipo: TipoAviso = "info") => {
    const id = ++proximoId.current
    // No maximo 3 na tela: uma rajada de erros nao cobre a pagina.
    setAvisos(a => [...a.slice(-2), { id, texto, tipo }])
    setTimeout(() => remover(id), TEMPO_AVISO[tipo])
  }, [remover])

  const ctx = useMemo<Contexto>(() => ({ confirmar, avisar }), [confirmar, avisar])

  return (
    <AvisosContext.Provider value={ctx}>
      {children}

      {/* Acima de qualquer modal da pagina: a confirmacao costuma nascer de
          dentro de um (ex.: "Limpar o carrinho?" no VendaModal). */}
      <div className="relative z-[100]">
        <Modal
          aberto={!!pedido}
          onFechar={cancelar}
          titulo={pedido?.titulo}
          tamanho="sm"
          className="h-auto mt-auto md:mt-0 rounded-t-2xl md:rounded-2xl"
          rodape={
            <>
              <Button variant="ghost" onClick={cancelar}>{pedido?.cancelar ?? "Cancelar"}</Button>
              {/* Foco no confirmar: Enter confirma e Esc cancela, como no nativo. */}
              <Button autoFocus variant={pedido?.perigo ? "danger" : "accent"} onClick={() => responder(true)}>
                {pedido?.confirmar ?? "Confirmar"}
              </Button>
            </>
          }
        >
          {pedido?.mensagem
            ? <div className="text-fg-2 text-sm whitespace-pre-line">{pedido.mensagem}</div>
            : <div className="text-fg-3 text-sm">Deseja continuar?</div>}
        </Modal>
      </div>

      <div
        aria-live="polite"
        className="fixed inset-x-0 z-[110] flex flex-col items-center gap-2 px-4 pointer-events-none bottom-[calc(var(--h-mobilenav)+0.75rem)] md:bottom-6"
      >
        {avisos.map(a => (
          <div
            key={a.id}
            role={a.tipo === "erro" ? "alert" : "status"}
            onClick={() => remover(a.id)}
            className={cn(
              "pointer-events-auto max-w-md w-full md:w-auto rounded-xl border bg-surface-1 shadow-lg shadow-black/30 px-4 py-3 text-sm whitespace-pre-line cursor-pointer",
              ESTILO_AVISO[a.tipo]
            )}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  )
}

