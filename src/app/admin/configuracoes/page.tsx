"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin/AdminLayout"

type Config = {
  groq_api_key?: string
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<Config>({})
  const [groqKey, setGroqKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/config")
      .then(r => r.json())
      .then((d: Config) => {
        setConfig(d)
        setGroqKey(d.groq_api_key ?? "")
      })
      .finally(() => setLoading(false))
  }, [])

  async function salvar() {
    setSalvando(true)
    setMsg(null)
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groq_api_key: groqKey }),
    })
    setSalvando(false)
    setMsg(res.ok ? { type: "ok", text: "Configurações salvas." } : { type: "err", text: "Erro ao salvar." })
  }

  const keyMasked = groqKey ? groqKey.slice(0, 8) + "•".repeat(Math.max(0, groqKey.length - 12)) + groqKey.slice(-4) : ""

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Configurações da Plataforma</h1>
          <p className="text-zinc-500 text-sm mt-1">Chaves de API e licenças globais</p>
        </div>

        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm border ${msg.type === "ok" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="text-zinc-500 text-sm">Carregando...</div>
        ) : (
          <>
            {/* Groq API */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-semibold text-sm">Groq API Key</h2>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Usada pela Central IA, IA Estoque e IA Biotipo. Licenças IA ativadas por organização na página de Empresas.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1.5 block">Chave API</label>
                <div className="flex gap-2">
                  <input
                    type={showKey ? "text" : "password"}
                    value={groqKey}
                    onChange={e => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 hover:text-white text-xs transition-colors"
                  >
                    {showKey ? "Ocultar" : "Ver"}
                  </button>
                </div>
                {groqKey && !showKey && (
                  <p className="text-zinc-600 text-xs mt-1 font-mono">{keyMasked}</p>
                )}
              </div>

              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-xs text-zinc-500 space-y-1">
                <p>• Obtenha sua chave em <span className="text-zinc-400">console.groq.com</span></p>
                <p>• Modelo de visão usado: <span className="text-zinc-400 font-mono">llama-4-scout-17b</span></p>
                <p>• A chave é compartilhada entre todas as organizações licenciadas</p>
              </div>
            </div>

            <button
              onClick={salvar}
              disabled={salvando}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {salvando ? "Salvando..." : "Salvar configurações"}
            </button>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
