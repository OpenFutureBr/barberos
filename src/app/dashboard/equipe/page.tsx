"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const vinculoStyle: Record<string, string> = {
  CLT: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  MEI: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  PJ: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  SOLO: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  PARTNER: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
}

const vinculoLabel: Record<string, string> = {
  CLT: "CLT",
  MEI: "MEI",
  PJ: "PJ",
  SOLO: "Autônomo 🚗",
  PARTNER: "Parceiro",
}

export default function EquipePage() {
  const [equipe, setEquipe] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [vinculo, setVinculo] = useState("CLT")
  const [comissao, setComissao] = useState("")
  const [bancada, setBancada] = useState("")

  useEffect(() => {
    buscarEquipe()
  }, [])

  async function buscarEquipe() {
    setLoading(true)
    try {
      const res = await fetch("/api/equipe")
      const data = await res.json()
      setEquipe(Array.isArray(data) ? data : [])
    } catch {
      setErro("Erro ao carregar equipe")
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro("")
    try {
      const res = await fetch("/api/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome,
          email,
          phone: telefone,
          employmentType: vinculo,
          commissionPct: comissao,
          benchFee: bancada,
          role: vinculo === "SOLO" ? "AUTONOMO" : "BARBER_CLT",
        }),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      await buscarEquipe()
      setModalAberto(false)
      setNome("")
      setEmail("")
      setTelefone("")
      setVinculo("CLT")
      setComissao("")
      setBancada("")
    } catch {
      setErro("Erro ao salvar profissional. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Equipe</h1>
          <p className="text-zinc-500 text-sm">{equipe.length} profissionais · CLT · PJ · MEI · Autônomo</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Profissional
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
            Carregando equipe...
          </div>
        ) : equipe.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="text-zinc-600 text-sm mb-2">Nenhum profissional cadastrado ainda</div>
            <button
              onClick={() => setModalAberto(true)}
              className="text-amber-400 text-sm hover:text-amber-300 transition-colors"
            >
              Cadastrar primeiro profissional →
            </button>
          </div>
        ) : (
          equipe.map((prof) => (
            <div key={prof.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {prof.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-medium">{prof.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${vinculoStyle[prof.employmentType] ?? vinculoStyle.CLT}`}>
                    {vinculoLabel[prof.employmentType] ?? prof.employmentType}
                  </span>
                </div>
                <div className="text-zinc-500 text-xs">{prof.email} {prof.phone ? `· ${prof.phone}` : ""}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-amber-400 font-bold text-sm">
                  {prof.commissionPct ? `${prof.commissionPct}%` : "—"}
                </div>
                <div className="text-zinc-600 text-xs">
                  {prof.employmentType === "MEI" ? "comissão + bancada" :
                   prof.employmentType === "SOLO" ? "PIX direto" : "de comissão"}
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  Ativo
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-1">Lei do Salão Parceiro · Lei 13.352/2016</div>
        <div className="text-zinc-400 text-sm">Profissionais MEI têm gestão adaptada à legislação brasileira. O sistema calcula taxa de bancada e gera relatório para emissão de NF no CNPJ do profissional.</div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Profissional</h2>
              <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome completo *</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="Ex: Lucas Carvalho"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Email *</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="email@exemplo.com"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Telefone</label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Tipo de vínculo *</label>
                <div className="grid grid-cols-3 gap-2">
                  {["CLT", "MEI", "PJ", "PARTNER", "SOLO"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVinculo(v)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                        vinculo === v
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      {vinculoLabel[v]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Comissão (%)</label>
                <input
                  value={comissao}
                  onChange={(e) => setComissao(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Ex: 40"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              {vinculo === "MEI" && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                  <label className="text-purple-400 text-xs mb-1 block">Taxa de bancada (R$/mês)</label>
                  <input
                    value={bancada}
                    onChange={(e) => setBancada(e.target.value)}
                    type="number"
                    placeholder="Ex: 800"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
                  />
                  <p className="text-zinc-600 text-xs mt-1">Valor fixo mensal que o MEI paga para usar o espaço</p>
                </div>
              )}
              {vinculo === "SOLO" && (
                <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3">
                  <div className="text-teal-400 text-xs font-mono mb-1">🚗 Autônomo domicílio</div>
                  <p className="text-zinc-500 text-xs">PIX vai 100% direto para este profissional.</p>
                </div>
              )}
              {erro && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">
                  {erro}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {salvando ? "Salvando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}