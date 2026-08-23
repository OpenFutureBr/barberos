"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin/AdminLayout"

type Config = {
  groq_api_key?: string
  gemini_api_key?: string
  ia_vision_provider?: string
  ia_text_provider?: string
  empresa_cnpj?: string
  empresa_endereco?: string
  empresa_cep?: string
}

function Toggle({ ativo, onChange }: { ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!ativo)}
      className={`w-10 h-5 rounded-full border-2 relative flex-shrink-0 transition-all ${ativo ? "bg-amber-500 border-amber-500" : "bg-zinc-700 border-zinc-600"}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${ativo ? "left-5" : "left-0.5"}`} />
    </button>
  )
}

type ProviderCard = { id: string; nome: string; desc: string; cor: string; icon: string }

const PROVIDERS: ProviderCard[] = [
  { id: "gemini", nome: "Gemini", desc: "Google · melhor para visão · free 1.500 req/dia", cor: "border-blue-500/40 bg-blue-500/5 text-blue-400", icon: "◈" },
  { id: "groq",   nome: "Groq",   desc: "Ultra-rápido · ideal para texto · free generoso",  cor: "border-orange-500/40 bg-orange-500/5 text-orange-400", icon: "⚡" },
]

function ProviderSelector({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-zinc-400 text-xs mb-2 block">{label}</label>
      <div className="flex gap-2">
        {PROVIDERS.map(p => (
          <button key={p.id} type="button" onClick={() => onChange(p.id)}
            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${value === p.id ? p.cor : "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600"}`}>
            <span className="text-base">{p.icon}</span>
            <div>
              <div className="text-sm font-semibold leading-tight">{p.nome}</div>
              <div className="text-[10px] opacity-70 leading-snug">{p.desc}</div>
            </div>
            {value === p.id && (
              <span className="ml-auto text-xs">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<Config>({})
  const [groqKey, setGroqKey] = useState("")
  const [geminiKey, setGeminiKey] = useState("")
  const [visionProvider, setVisionProvider] = useState("gemini")
  const [textProvider, setTextProvider] = useState("groq")
  const [showGroq, setShowGroq] = useState(false)
  const [showGemini, setShowGemini] = useState(false)
  const [empresaCnpj, setEmpresaCnpj] = useState("")
  const [empresaEndereco, setEmpresaEndereco] = useState("")
  const [empresaCep, setEmpresaCep] = useState("")
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/config")
      .then(r => r.json())
      .then((d: Config) => {
        setConfig(d)
        setGroqKey(d.groq_api_key ?? "")
        setGeminiKey(d.gemini_api_key ?? "")
        setVisionProvider(d.ia_vision_provider ?? "gemini")
        setTextProvider(d.ia_text_provider ?? "groq")
        setEmpresaCnpj(d.empresa_cnpj ?? "")
        setEmpresaEndereco(d.empresa_endereco ?? "")
        setEmpresaCep(d.empresa_cep ?? "")
      })
      .finally(() => setLoading(false))
  }, [])

  async function salvar() {
    setSalvando(true)
    setMsg(null)
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groq_api_key: groqKey,
        gemini_api_key: geminiKey,
        ia_vision_provider: visionProvider,
        ia_text_provider: textProvider,
        empresa_cnpj: empresaCnpj,
        empresa_endereco: empresaEndereco,
        empresa_cep: empresaCep,
      }),
    })
    setSalvando(false)
    setMsg(res.ok ? { type: "ok", text: "Configurações salvas com sucesso." } : { type: "err", text: "Erro ao salvar." })
  }

  function maskKey(k: string) {
    if (!k || k.length < 12) return k
    return k.slice(0, 6) + "•".repeat(Math.max(0, k.length - 10)) + k.slice(-4)
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Configurações de IA</h1>
          <p className="text-zinc-500 text-sm mt-1">Chaves de API e roteamento de providers por funcionalidade</p>
        </div>

        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm border ${msg.type === "ok" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="text-zinc-500 text-sm">Carregando...</div>
        ) : (
          <div className="space-y-5">

            {/* Roteamento */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">⚙</div>
                <h2 className="text-white font-semibold text-sm">Roteamento de providers</h2>
              </div>

              <ProviderSelector
                label="Visão (foto / câmera) — IA Biotipo"
                value={visionProvider}
                onChange={setVisionProvider}
              />

              <ProviderSelector
                label="Texto — Central IA, IA Estoque"
                value={textProvider}
                onChange={setTextProvider}
              />

              <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-4 py-3 text-xs text-zinc-500 space-y-0.5">
                <p>• Default recomendado: <span className="text-zinc-300">Gemini para visão · Groq para texto</span></p>
                <p>• Fallback automático: se o provider principal não tiver chave, usa o outro</p>
                <p>• Ambos na cota gratuita cobrem bem o uso de desenvolvimento</p>
              </div>
            </div>

            {/* Chaves */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs">🔑</div>
                <h2 className="text-white font-semibold text-sm">Chaves de API</h2>
              </div>

              {/* Gemini */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-400 text-xs">Google Gemini API Key</label>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    aistudio.google.com ↗
                  </a>
                </div>
                <div className="flex gap-2">
                  <input type={showGemini ? "text" : "password"} value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-blue-500 transition-colors" />
                  <button type="button" onClick={() => setShowGemini(v => !v)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 hover:text-white text-xs transition-colors">
                    {showGemini ? "Ocultar" : "Ver"}
                  </button>
                </div>
                {geminiKey && !showGemini && <p className="text-zinc-600 text-xs font-mono">{maskKey(geminiKey)}</p>}
                <p className="text-zinc-600 text-[10px]">Gemini 2.0 Flash · free: 1.500 req/dia · sem cartão</p>
              </div>

              <div className="border-t border-zinc-800" />

              {/* Groq */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-400 text-xs">Groq API Key</label>
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                    console.groq.com ↗
                  </a>
                </div>
                <div className="flex gap-2">
                  <input type={showGroq ? "text" : "password"} value={groqKey}
                    onChange={e => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-orange-500 transition-colors" />
                  <button type="button" onClick={() => setShowGroq(v => !v)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 hover:text-white text-xs transition-colors">
                    {showGroq ? "Ocultar" : "Ver"}
                  </button>
                </div>
                {groqKey && !showGroq && <p className="text-zinc-600 text-xs font-mono">{maskKey(groqKey)}</p>}
                <p className="text-zinc-600 text-[10px]">llama-3.3-70b + llama-4-scout-17b vision · free generoso</p>
              </div>
            </div>

            {/* Dados da empresa (documentos legais) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs">📄</div>
                <h2 className="text-white font-semibold text-sm">Dados da empresa (documentos legais)</h2>
              </div>
              <p className="text-zinc-600 text-xs -mt-2">
                Preencha assim que a OpenFutureBr Tecnologia Ltda for aberta oficialmente. Esses dados alimentam automaticamente os Termos de Uso, Política de Privacidade e Contrato SaaS em <span className="font-mono text-zinc-500">/aceite-legal</span>.
              </p>

              <div className="space-y-1.5">
                <label className="text-zinc-400 text-xs block">CNPJ</label>
                <input value={empresaCnpj} onChange={e => setEmpresaCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 text-xs block">Endereço da sede</label>
                <input value={empresaEndereco} onChange={e => setEmpresaEndereco(e.target.value)}
                  placeholder="Rua, número, bairro — São Paulo/SP"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 text-xs block">CEP</label>
                <input value={empresaCep} onChange={e => setEmpresaCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full sm:w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Gemini", ok: !!geminiKey, provider: visionProvider === "gemini" ? "Visão" : textProvider === "gemini" ? "Texto" : "Standby" },
                { label: "Groq",   ok: !!groqKey,   provider: textProvider === "groq"   ? "Texto" : visionProvider === "groq"   ? "Visão"  : "Standby" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-3 ${s.ok ? "border-green-500/20 bg-green-500/5" : "border-zinc-700 bg-zinc-800/30"}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.ok ? "bg-green-400" : "bg-zinc-600"}`} />
                  <div>
                    <div className="text-white text-xs font-medium">{s.label}</div>
                    <div className={`text-[10px] ${s.ok ? "text-green-400" : "text-zinc-600"}`}>
                      {s.ok ? s.provider : "Sem chave"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={salvar} disabled={salvando}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors">
              {salvando ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
