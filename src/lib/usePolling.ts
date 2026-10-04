"use client"

import { useEffect, useRef } from "react"

/**
 * Executa `fn` a cada `ms` enquanto a aba estiver visível.
 *
 * - Aba escondida: para. O Painel TV e a Fila faziam ~12 requisições/min
 *   cada, 24h por dia, mesmo minimizados; o WhatsApp consultava a API externa.
 * - Aba volta a ficar visível: roda na hora (o dado pode estar velho) e
 *   retoma o intervalo.
 * - Sem sobreposição: se a execução anterior (Promise) ainda não terminou, a
 *   próxima é pulada — o QR do WhatsApp a cada 3s empilhava requisições em
 *   rede lenta.
 * - Erros são engolidos: uma falha não derruba as próximas execuções.
 *
 * `fn` é lida por ref, então não precisa ser memorizada.
 */
export function usePolling(
  fn: () => unknown,
  ms: number,
  opts: { ativo?: boolean; imediato?: boolean } = {},
) {
  const { ativo = true, imediato = false } = opts
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  useEffect(() => {
    if (!ativo) return
    let timer: ReturnType<typeof setInterval> | undefined
    let rodando = false

    const executar = async () => {
      if (rodando) return
      rodando = true
      try { await fnRef.current() } catch { /* próxima execução tenta de novo */ }
      finally { rodando = false }
    }
    const iniciar = () => { if (timer === undefined) timer = setInterval(executar, ms) }
    const parar = () => { clearInterval(timer); timer = undefined }

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") { executar(); iniciar() }
      else parar()
    }

    if (document.visibilityState === "visible") {
      if (imediato) executar()
      iniciar()
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade)
    return () => {
      parar()
      document.removeEventListener("visibilitychange", aoMudarVisibilidade)
    }
  }, [ms, ativo, imediato])
}
