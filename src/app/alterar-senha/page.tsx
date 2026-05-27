"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function AlterarSenhaPage() {
  const { update } = useSession()
  const router = useRouter()
  const [nova, setNova] = useState("")
  const [confirma, setConfirma] = useState("")
  const [erro, setErro] = useState("")
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    if (nova.length < 6) { setErro("Senha deve ter ao menos 6 caracteres."); return }
    if (nova !== confirma) { setErro("As senhas não coincidem."); return }

    setSalvando(true)
    try {
      const res = await fetch("/api/auth/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaSenha: nova }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErro(d.error ?? "Erro ao salvar senha.")
        return
      }
      // Atualiza JWT para refletir isFirstLogin: false
      await update({ isFirstLogin: false })
      router.push("/dashboard")
      router.refresh()
    } catch {
      setErro("Erro ao conectar. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-black text-2xl font-black mb-4">
            🔒
          </div>
          <h1 className="text-white text-2xl font-bold">Definir nova senha</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Primeiro acesso — crie uma senha segura
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-zinc-400 text-xs block mb-1.5">Nova senha</label>
            <input
              type="password"
              value={nova}
              onChange={e => setNova(e.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              required
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs block mb-1.5">Confirmar senha</label>
            <input
              type="password"
              value={confirma}
              onChange={e => setConfirma(e.target.value)}
              autoComplete="new-password"
              placeholder="Repita a senha"
              required
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-lg text-sm transition-colors"
          >
            {salvando ? "Salvando..." : "Salvar e entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
