"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

// Barra de progresso no topo.
//
// Antes ela só reagia à troca da URL — que acontece quando a tela nova JÁ
// chegou. Durante a espera de verdade, logo depois do clique, não havia sinal
// nenhum. Agora começa no clique de qualquer link interno, vai avançando
// devagar até ~80% enquanto espera, e completa quando o pathname muda.
//
// Anima com transform (scaleX) em vez de width: width força recálculo de
// layout a cada quadro.

const LIMITE_MS = 8000 // se a navegação não acontecer, some sozinha

function ehNavegacaoInterna(e: MouseEvent, pathnameAtual: string): boolean {
  if (e.defaultPrevented || e.button !== 0) return false
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false
  const a = (e.target as Element | null)?.closest?.("a")
  if (!a || !a.href) return false
  if (a.target && a.target !== "_self") return false
  if (a.hasAttribute("download")) return false
  const url = new URL(a.href, location.href)
  if (url.origin !== location.origin) return false
  return url.pathname !== pathnameAtual
}

export default function NavigationProgress() {
  const pathname = usePathname()
  const [progresso, setProgresso] = useState(0) // 0..1
  const [visivel, setVisivel] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const ativo = useRef(false)
  const pathnameRef = useRef(pathname)

  function limpar() { timers.current.forEach(clearTimeout); timers.current = [] }
  function agendar(fn: () => void, ms: number) { timers.current.push(setTimeout(fn, ms)) }

  function concluir() {
    limpar()
    ativo.current = false
    setProgresso(1)
    agendar(() => setVisivel(false), 200)
    agendar(() => setProgresso(0), 450)
  }

  // Início: clique num link interno
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (!ehNavegacaoInterna(e, pathnameRef.current)) return
      limpar()
      ativo.current = true
      setVisivel(true)
      setProgresso(0.15)
      agendar(() => setProgresso(0.45), 150)
      agendar(() => setProgresso(0.65), 600)
      agendar(() => setProgresso(0.8), 1500)
      agendar(concluir, LIMITE_MS)
    }
    // Captura: roda antes de o Link do Next tratar o clique
    document.addEventListener("click", aoClicar, true)
    return () => document.removeEventListener("click", aoClicar, true)
    // limpar/agendar/concluir só mexem em refs e setters estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fim: a tela trocou. Também cobre navegação sem clique (router.push,
  // voltar do navegador), mostrando só o fechamento.
  useEffect(() => {
    if (pathname === pathnameRef.current) return
    pathnameRef.current = pathname
    if (!ativo.current) setVisivel(true)
    concluir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => limpar, [])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ opacity: visivel ? 1 : 0, transition: "opacity 250ms ease-out" }}
      aria-hidden
    >
      <div
        className="h-full bg-amber-500 origin-left"
        style={{
          transform: `scaleX(${progresso})`,
          transition: progresso === 0 ? "none" : "transform 300ms ease-out",
        }}
      />
    </div>
  )
}
