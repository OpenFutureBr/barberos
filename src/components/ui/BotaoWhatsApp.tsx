"use client"

import { useState } from "react"
import { enviarWhatsApp } from "@/lib/whatsapp"

type Props = {
  telefone: string
  nome: string
  mensagem?: string
  className?: string
  label?: string
}

export default function BotaoWhatsApp({ telefone, nome, mensagem, className, label }: Props) {
  const [status, setStatus] = useState<"idle" | "enviando" | "ok" | "erro">("idle")

  async function handleClick() {
    if (status === "enviando") return
    setStatus("enviando")

    const texto = mensagem ?? `Olá ${nome}! Sentimos sua falta na Barbearia Costa. Que tal agendar um horário? 😊`

    const result = await enviarWhatsApp(telefone, texto)
    setStatus(result.ok ? "ok" : "erro")
    setTimeout(() => setStatus("idle"), 3000)
  }

  const base = className ?? "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"

  if (status === "ok") return (
    <span className={`${base} bg-green-500/20 text-green-400 border border-green-500/20`}>✓ Enviado</span>
  )
  if (status === "erro") return (
    <span className={`${base} bg-red-500/20 text-red-400 border border-red-500/20`}>✕ Erro</span>
  )

  return (
    <button
      onClick={handleClick}
      disabled={status === "enviando"}
      className={`${base} bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 disabled:opacity-50`}
    >
      {status === "enviando" ? "Enviando..." : (label ?? "💬 WhatsApp")}
    </button>
  )
}
