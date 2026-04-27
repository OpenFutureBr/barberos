"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

export default function WhiteLabelPage() {
  const [nomeMarca, setNomeMarca] = useState("Barbearia Costa")
  const [corPrimaria, setCorPrimaria] = useState("#c9a84c")
  const [corSecundaria, setCorSecundaria] = useState("#26c9b2")
  const [dominio, setDominio] = useState("barbearia-costa.com")
  const [slogan, setSlogan] = useState("Estilo e precisão em cada corte")
  const [salvo, setSalvo] = useState(false)

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">White-label & Marca</h1>
          <p className="text-zinc-500 text-sm">Personalize o sistema com a identidade visual do seu negócio</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
          Plano Business
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* Configurações */}
        <div>
          <form onSubmit={handleSalvar} className="space-y-4">

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Identidade da marca</div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome da marca *</label>
                <input
                  value={nomeMarca}
                  onChange={(e) => setNomeMarca(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Slogan</label>
                <input
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Logo da marca</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-black flex-shrink-0" style={{ backgroundColor: corPrimaria }}>
                    {nomeMarca.charAt(0)}
                  </div>
                  <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg border border-zinc-700 transition-colors cursor-pointer">
                    Enviar logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          alert(`Logo "${e.target.files[0].name}" selecionada!`)
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Cores do sistema</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Cor primária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-zinc-800"
                    />
                    <input
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Cor secundária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-zinc-800"
                    />
                    <input
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Domínio personalizado</div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Domínio *</label>
                <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500 transition-colors">
                  <span className="text-zinc-600 text-xs px-3 border-r border-zinc-700 py-2">https://</span>
                  <input
                    value={dominio}
                    onChange={(e) => setDominio(e.target.value)}
                    className="flex-1 bg-transparent text-white px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="text-zinc-600 text-xs mt-1">Configure o CNAME do seu DNS apontando para: app.barberos.com</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
              >
                Salvar configurações
              </button>
              {salvo && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  ✓ Salvo com sucesso
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Preview */}
        <div>
          <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Preview em tempo real</div>

          {/* Preview do sistema */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">

            {/* Sidebar mini */}
            <div className="flex">
              <div className="w-32 bg-zinc-900 border-r border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ backgroundColor: corPrimaria }}>
                    {nomeMarca.charAt(0)}
                  </div>
                  <div className="text-white text-xs font-bold truncate">{nomeMarca.split(" ")[0]}</div>
                </div>
                {["Dashboard", "Agenda", "Clientes", "Financeiro"].map((item) => (
                  <div key={item} className="text-zinc-500 text-xs py-1 px-2 rounded mb-0.5 hover:bg-zinc-800 cursor-pointer">
                    {item}
                  </div>
                ))}
              </div>

              {/* Content mini */}
              <div className="flex-1 p-3">
                <div className="text-white text-xs font-bold mb-2">{nomeMarca}</div>
                <div className="text-zinc-600 text-xs mb-3 italic">{slogan}</div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Faturamento", val: "R$ 1.840", col: corPrimaria },
                    { label: "Clientes", val: "247", col: corSecundaria },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-zinc-800 rounded-lg p-2 border-t-2" style={{ borderColor: kpi.col }}>
                      <div className="text-zinc-500 text-xs">{kpi.label}</div>
                      <div className="text-sm font-bold" style={{ color: kpi.col }}>{kpi.val}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-800 rounded-lg p-2 flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">Link de agendamento</span>
                  <span className="text-xs font-mono" style={{ color: corPrimaria }}>
                    {dominio}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão exemplo */}
            <div className="border-t border-zinc-800 p-3 flex gap-2">
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-black transition-colors"
                style={{ backgroundColor: corPrimaria }}
              >
                + Agendar
              </button>
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-black transition-colors"
                style={{ backgroundColor: corSecundaria }}
              >
                Ver fila
              </button>
            </div>
          </div>

          {/* Domínio info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-3">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-2">URL do sistema</div>
            <div className="font-mono text-sm" style={{ color: corPrimaria }}>
              https://{dominio}
            </div>
            <div className="text-zinc-600 text-xs mt-1">
              Seus clientes acessam o sistema pela sua própria URL personalizada
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  )
}