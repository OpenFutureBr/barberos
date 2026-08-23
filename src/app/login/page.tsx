"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"

async function irParaDestino(router: ReturnType<typeof useRouter>, isTV: boolean) {
  if (isTV) {
    router.push("/dashboard/painel-tv")
    router.refresh()
    return
  }
  const session = await getSession()
  const destino = session?.user?.role === "ADMIN" ? "/admin" : "/dashboard"
  router.push(destino)
  router.refresh()
}

function LoginQR() {
  const router = useRouter()
  const [ehTV, setEhTV] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<"gerando" | "aguardando" | "aprovado" | "expirado" | "erro">("gerando")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const gerarCodigo = useCallback(async () => {
    setStatus("gerando")
    try {
      const res = await fetch("/api/auth/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTV: ehTV }),
      })
      const data = await res.json()
      if (!res.ok || !data.token) { setStatus("erro"); return }
      setToken(data.token)
      setStatus("aguardando")
    } catch {
      setStatus("erro")
    }
  }, [ehTV])

  useEffect(() => { gerarCodigo() }, [gerarCodigo])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!token || status !== "aguardando") return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/pairing/${token}`)
        const data = await res.json()
        if (data.status === "APPROVED") {
          setStatus("aprovado")
          if (pollRef.current) clearInterval(pollRef.current)
          const signRes = await signIn("credentials", { pairingToken: token, redirect: false })
          if (signRes?.error) { setStatus("erro"); return }
          await irParaDestino(router, ehTV)
        } else if (data.status === "EXPIRED" || data.status === "NOT_FOUND") {
          setStatus("expirado")
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {}
    }, 2500)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [token, status, ehTV, router])

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const qrUrl = token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${origin}/parear/${token}`)}`
    : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col items-center gap-3">
        {status === "expirado" ? (
          <div className="text-center py-6">
            <p className="text-zinc-400 text-sm mb-3">Código expirado.</p>
            <button onClick={gerarCodigo} className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors">
              Gerar novo código
            </button>
          </div>
        ) : status === "erro" ? (
          <div className="text-center py-6">
            <p className="text-red-400 text-sm mb-3">Não foi possível gerar o código.</p>
            <button onClick={gerarCodigo} className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : status === "aprovado" ? (
          <div className="text-center py-10">
            <div className="text-green-400 text-2xl mb-2">✓</div>
            <p className="text-zinc-300 text-sm">Aprovado! Entrando...</p>
          </div>
        ) : qrUrl ? (
          <>
            <div className="bg-white p-3 rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR Code de login" width={200} height={200} data-no-invert />
            </div>
            <p className="text-zinc-400 text-xs text-center leading-relaxed">
              Abra a câmera do celular já conectado ao BarberOS<br />e aponte para o código.
            </p>
          </>
        ) : (
          <div className="h-[200px] w-[200px] bg-zinc-800 rounded-xl animate-pulse" />
        )}
      </div>

      <label className="flex items-center gap-2 justify-center text-xs text-zinc-500 pt-1 border-t border-zinc-800">
        <input
          type="checkbox"
          checked={ehTV}
          onChange={e => { setEhTV(e.target.checked); gerarCodigo() }}
          className="accent-amber-500"
        />
        Este aparelho é uma TV (abrir Painel de TV direto)
      </label>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [modo, setModo] = useState<"senha" | "qr">("senha")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    try {
      const res = await signIn("credentials", { username, password, redirect: false })
      if (res?.error) {
        setErro("Usuário ou senha incorretos.")
      } else {
        const session = await getSession()
        const destino = session?.user?.role === "ADMIN" ? "/admin" : "/dashboard"
        router.push(destino)
        router.refresh()
      }
    } catch {
      setErro("Erro ao conectar. Tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-black text-2xl font-black mb-4">
            ✂
          </div>
          <h1 className="text-white text-2xl font-bold">BarberOS</h1>
          <p className="text-zinc-500 text-sm mt-1">Sistema de Gestão</p>
        </div>

        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-3 gap-1">
          <button type="button" onClick={() => setModo("senha")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${modo === "senha" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-zinc-200"}`}>
            Usuário e senha
          </button>
          <button type="button" onClick={() => setModo("qr")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${modo === "qr" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-zinc-200"}`}>
            QR Code
          </button>
        </div>

        {modo === "qr" ? (
          <LoginQR />
        ) : (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-zinc-400 text-xs block mb-1.5">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="primeiro.sobrenome"
              required
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs block mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {mostrarSenha ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-lg text-sm transition-colors"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-center text-zinc-600 text-xs pt-1">
            Esqueceu a senha?{" "}
            <span className="text-zinc-500">Peça ao administrador para resetar o seu acesso.</span>
          </p>
        </form>
        )}

        <p className="text-center text-zinc-600 text-xs mt-6">
          Acesso restrito a colaboradores autorizados
        </p>
        <p className="text-center text-zinc-700 text-xs mt-2">
          <a href="/aceite-legal" className="hover:text-zinc-500 transition-colors">Termos de Uso e Política de Privacidade</a>
        </p>
        <p className="text-center text-zinc-700 text-xs mt-2">
          Desenvolvido por <span className="text-zinc-600">OpenFuture</span> ®
        </p>
      </div>
    </div>
  )
}
