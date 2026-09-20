"use client"

import { useEffect } from "react"
import { aplicarTema, lerTema, lerEixoMarca, salvarEixoMarca } from "@/lib/tema"
import { corParaEixoAcento } from "@/lib/marca"

// Liga a cor da marca da organizacao (White-label) ao acento do tema.
// Nao renderiza nada: monta no shell do dashboard, le /api/org/marca uma vez e
// grava o eixo [hue, croma] no localStorage, de onde o script de boot do
// layout.tsx passa a ler nas cargas seguintes (sem piscar no acento errado).
export default function AplicadorMarca() {
  useEffect(() => {
    let vivo = true

    function aplicar(cor: string) {
      const eixo = cor ? corParaEixoAcento(cor) : null
      const atual = lerEixoMarca()
      const igual = eixo && atual && eixo.h === atual.h && eixo.c === atual.c
      if (igual) return
      salvarEixoMarca(eixo)
      // Repinta so se o acento em uso for o da marca. Quem escolheu Rose no
      // proprio dispositivo nao tem a tela trocada por baixo.
      const tema = lerTema()
      if (tema.acento === "marca") aplicarTema(tema, true)
      // Avisa o store do SeletorTema de qualquer jeito: a opcao "Marca" precisa
      // aparecer na grade de acentos mesmo para quem nao esta usando ela.
      window.dispatchEvent(new CustomEvent("temaAlterado", { detail: tema }))
    }

    fetch("/api/org/marca")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivo && d && !d.error) aplicar(typeof d.corPrimaria === "string" ? d.corPrimaria : "") })
      .catch(() => {})

    // O White-label dispara isso ao salvar, pra cor valer na hora.
    function onMarcaAlterada(e: Event) {
      const cor = (e as CustomEvent).detail
      aplicar(typeof cor === "string" ? cor : "")
    }
    window.addEventListener("marcaAlterada", onMarcaAlterada)

    return () => {
      vivo = false
      window.removeEventListener("marcaAlterada", onMarcaAlterada)
    }
  }, [])

  return null
}
