"use client"

import { useEffect } from "react"
// Importado aqui, no layout raiz, so para comecar a ouvir o evento de
// instalacao o quanto antes (ver o arquivo).
import "@/lib/useInstalarApp"

// Registra o service worker (public/sw.js), exigido para o celular oferecer
// "Instalar app". Fica fora do `next dev`: la ele so atrapalharia o hot reload.
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])
  return null
}
