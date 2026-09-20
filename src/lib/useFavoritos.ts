"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import {
  EVENTO_PALETA, alternarFavorito, lerFavoritos, lerVisitas, registrarVisita,
} from "@/lib/paleta"

// Favoritos e contador de visitas da busca global.
//
// A leitura NUNCA acontece durante o render: localStorage nao existe no
// servidor, e ler no corpo (ou no lazy init do useState) faz o cliente
// renderizar diferente do que veio do servidor. Esse desencontro sobe ate o
// <html> e o React recria o elemento, levando embora os data-* do tema — ja
// aconteceu neste projeto pelo Sidebar. Por isso: estado vazio no primeiro
// render, preenchido no useEffect.
export function useFavoritos() {
  const { data: session } = useSession()
  const usuario = session?.user?.id ?? ""

  const [favoritos, setFavoritos] = useState<string[]>([])
  const [visitas, setVisitas] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!usuario) return
    const sincronizar = () => {
      setFavoritos(lerFavoritos(usuario))
      setVisitas(lerVisitas(usuario))
    }
    sincronizar()
    // "paletaAlterada" cobre mudancas nesta aba; "storage", em outras abas.
    window.addEventListener(EVENTO_PALETA, sincronizar)
    window.addEventListener("storage", sincronizar)
    return () => {
      window.removeEventListener(EVENTO_PALETA, sincronizar)
      window.removeEventListener("storage", sincronizar)
    }
  }, [usuario])

  const alternar = useCallback((id: string) => {
    if (!usuario) return
    alternarFavorito(usuario, id)
  }, [usuario])

  const contarVisita = useCallback((id: string) => {
    if (!usuario) return
    registrarVisita(usuario, id)
  }, [usuario])

  const ehFavorito = useCallback((id: string) => favoritos.includes(id), [favoritos])

  return { usuario, favoritos, visitas, alternar, contarVisita, ehFavorito }
}

const MS_TOQUE_LONGO = 450

/**
 * Gesto de favoritar: botao direito no desktop, toque longo (~450ms) no mobile.
 * Foi decisao explicita do usuario nao usar estrelinha — o favorito fica no
 * menu de contexto, sem poluir a lista.
 *
 * O `layout.tsx` ja cancela o menu nativo do navegador globalmente, entao o
 * botao direito esta livre; o listener de la roda depois do handler do React
 * (o evento sobe do alvo ate o document), entao nao ha conflito.
 *
 * `onClick` do chamador deve checar `bloqueado()`: sem isso, o toque longo
 * favorita E executa o item, porque o navegador ainda dispara o click no fim
 * do toque.
 */
export function usePropsFavoritar(onAlternar: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const disparou = useRef(false)

  const limpar = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  useEffect(() => limpar, [limpar])

  return {
    bloqueado: () => {
      if (!disparou.current) return false
      disparou.current = false
      return true
    },
    props: {
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onAlternar()
      },
      onTouchStart: () => {
        disparou.current = false
        limpar()
        timer.current = setTimeout(() => {
          disparou.current = true
          onAlternar()
          // Confirma o gesto por vibracao: sem menu abrindo, e o unico retorno
          // de que o toque longo "pegou".
          try { navigator.vibrate?.(15) } catch {}
        }, MS_TOQUE_LONGO)
      },
      onTouchEnd: limpar,
      onTouchMove: limpar,
      onTouchCancel: limpar,
    },
  }
}
