"use client"

import { useState } from "react"

export default function ConfirmarPareamento({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "enviando" | "ok" | "erro">("idle")
  const [erro, setErro] = useState("")

  async function confirmar() {
    setStatus("enviando")
    setErro("")
    try {
      const res = await fetch(`/api/auth/pairing/${token}`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível confirmar.")
        setStatus("erro")
        return
      }
      setStatus("ok")
    } catch {
      setErro("Erro ao conectar.")
      setStatus("erro")
    }
  }

  if (status === "ok") {
    return (
      <div className="text-green-400 text-sm py-2">
        ✓ Acesso liberado! Volte para o outro dispositivo.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {erro && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erro}</div>
      )}
      <button
        onClick={confirmar}
        disabled={status === "enviando"}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-lg text-sm transition-colors"
      >
        {status === "enviando" ? "Confirmando..." : "Confirmar acesso"}
      </button>
    </div>
  )
}
