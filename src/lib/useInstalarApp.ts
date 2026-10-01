"use client"

import { useSyncExternalStore } from "react"

// Botao "Instalar app" (Android/Chrome).
//
// O Chrome dispara `beforeinstallprompt` UMA vez, logo depois de carregar a
// pagina — muitas vezes antes do menu montar. Por isso o evento e capturado
// aqui no nivel do modulo, que o RegistrarSW importa no layout raiz, e guardado
// numa store; quem precisa le com useSyncExternalStore.
//
// iPhone nao tem esse evento (la a instalacao e so pelo Compartilhar do
// Safari), entao o botao simplesmente nao aparece.

type EventoInstalacao = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let evento: EventoInstalacao | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach(f => f())

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => {
    // Sem isso o Chrome mostra o proprio aviso e o evento se perde.
    e.preventDefault()
    evento = e as EventoInstalacao
    avisar()
  })
  window.addEventListener("appinstalled", () => {
    evento = null
    avisar()
  })
}

function assinar(f: () => void) {
  ouvintes.add(f)
  return () => { ouvintes.delete(f) }
}

export function useInstalarApp() {
  const disponivel = useSyncExternalStore(assinar, () => evento !== null, () => false)

  async function instalar() {
    if (!evento) return
    const e = evento
    await e.prompt()
    await e.userChoice
    // O mesmo evento nao pode ser reaproveitado: aceitando ou recusando, o
    // botao some ate o Chrome oferecer de novo.
    evento = null
    avisar()
  }

  return { podeInstalar: disponivel, instalar }
}
