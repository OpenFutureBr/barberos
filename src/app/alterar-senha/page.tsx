"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

function calcularForca(senha: string): { nivel: number; label: string; cor: string } {
  if (senha.length === 0) return { nivel: 0, label: "", cor: "" }
  const temLetra = /[a-zA-Z]/.test(senha)
  const temNumero = /[0-9]/.test(senha)
  const temEspecial = /[^a-zA-Z0-9]/.test(senha)
  const tamanhoOk = senha.length >= 6
  const tamanhoForte = senha.length >= 10

  let pontos = 0
  if (tamanhoOk) pontos++
  if (temLetra) pontos++
  if (temNumero) pontos++
  if (temEspecial) pontos++
  if (tamanhoForte) pontos++

  if (pontos <= 2) return { nivel: 1, label: "Fraca", cor: "bg-red-500" }
  if (pontos === 3) return { nivel: 2, label: "Média", cor: "bg-amber-500" }
  if (pontos === 4) return { nivel: 3, label: "Boa", cor: "bg-yellow-400" }
  return { nivel: 4, label: "Forte", cor: "bg-green-500" }
}

function OlhoIcon({ aberto }: { aberto: boolean }) {
  return aberto ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

export default function AlterarSenhaPage() {
  const { update } = useSession()
  const router = useRouter()
  const [nova, setNova] = useState("")
  const [confirma, setConfirma] = useState("")
  const [mostrarNova, setMostrarNova] = useState(false)
  const [mostrarConfirma, setMostrarConfirma] = useState(false)
  const [erro, setErro] = useState("")
  const [salvando, setSalvando] = useState(false)

  const forca = calcularForca(nova)

  const temLetra = /[a-zA-Z]/.test(nova)
  const temNumero = /[0-9]/.test(nova)
  const temTamanho = nova.length >= 6
  const senhaValida = temLetra && temNumero && temTamanho

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    if (!senhaValida) { setErro("A senha não atende aos requisitos mínimos."); return }
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
          <p className="text-zinc-500 text-sm mt-1">Primeiro acesso — crie uma senha segura</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">

          {/* Nova senha */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1.5">Nova senha</label>
            <div className="relative">
              <input
                type={mostrarNova ? "text" : "password"}
                value={nova}
                onChange={e => setNova(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
              />
              <button type="button" tabIndex={-1} onClick={() => setMostrarNova(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                <OlhoIcon aberto={mostrarNova} />
              </button>
            </div>

            {/* Barra de força */}
            {nova.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= forca.nivel ? forca.cor : "bg-zinc-700"}`} />
                  ))}
                </div>
                <span className={`text-xs ${forca.nivel <= 1 ? "text-red-400" : forca.nivel === 2 ? "text-amber-400" : forca.nivel === 3 ? "text-yellow-400" : "text-green-400"}`}>
                  {forca.label}
                </span>
              </div>
            )}

            {/* Requisitos */}
            {nova.length > 0 && (
              <div className="mt-2 space-y-0.5">
                <div className={`text-xs flex items-center gap-1.5 ${temTamanho ? "text-green-400" : "text-zinc-500"}`}>
                  <span>{temTamanho ? "✓" : "○"}</span> Mínimo 6 caracteres
                </div>
                <div className={`text-xs flex items-center gap-1.5 ${temLetra ? "text-green-400" : "text-zinc-500"}`}>
                  <span>{temLetra ? "✓" : "○"}</span> Pelo menos uma letra
                </div>
                <div className={`text-xs flex items-center gap-1.5 ${temNumero ? "text-green-400" : "text-zinc-500"}`}>
                  <span>{temNumero ? "✓" : "○"}</span> Pelo menos um número
                </div>
              </div>
            )}
          </div>

          {/* Confirmar senha */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1.5">Confirmar senha</label>
            <div className="relative">
              <input
                type={mostrarConfirma ? "text" : "password"}
                value={confirma}
                onChange={e => setConfirma(e.target.value)}
                autoComplete="new-password"
                placeholder="Repita a senha"
                required
                className={`w-full bg-zinc-800 border text-white rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600 ${
                  confirma.length > 0 && confirma !== nova ? "border-red-500/50" : "border-zinc-700"
                }`}
              />
              <button type="button" tabIndex={-1} onClick={() => setMostrarConfirma(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                <OlhoIcon aberto={mostrarConfirma} />
              </button>
            </div>
            {confirma.length > 0 && confirma !== nova && (
              <p className="text-red-400 text-xs mt-1">As senhas não coincidem</p>
            )}
          </div>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={salvando || !senhaValida || nova !== confirma}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-2.5 rounded-lg text-sm transition-colors"
          >
            {salvando ? "Salvando..." : "Salvar e entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
