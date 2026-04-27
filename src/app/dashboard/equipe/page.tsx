"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const equipeMock = [
  { id: "1", nome: "Lucas Carvalho", email: "lucas@barberos.com", vinculo: "CLT", comissao: "40%", telefone: "(11) 99111-1111", ativo: true },
  { id: "2", nome: "Ana Santos", email: "ana@barberos.com", vinculo: "MEI", comissao: "55%", telefone: "(11) 99222-2222", ativo: true },
  { id: "3", nome: "Miguel Ferreira", email: "miguel@barberos.com", vinculo: "PJ", comissao: "50%", telefone: "(11) 99333-3333", ativo: true },
  { id: "4", nome: "Rafael Fonseca", email: "rafael@barberos.com", vinculo: "CLT", comissao: "40%", telefone: "(11) 99444-4444", ativo: true },
  { id: "5", nome: "Marina Nunes", email: "marina@barberos.com", vinculo: "SOLO", comissao: "100%", telefone: "(11) 99555-5555", ativo: true },
]

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
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [vinculo, setVinculo] = useState("CLT")
  const [comissao, setComissao] = useState("")
  const [bancada, setBancada] = useState("")

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setModalAberto(false)
    setNome("")
    setEmail("")
    setTelefone("")
    setVinculo("CLT")
    setComissao("")
    setBancada("")
  }

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Equipe</h1>
          <p className="text-zinc-500 text-sm">6 profissionais · CLT · PJ · MEI · Autônomo</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Profissional
        </button>
      </div>

      {/* Cards da equipe */}
      <div className="grid grid-cols-1 gap-3">
        {equipeMock.map((prof) => (
          <div key={prof.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {prof.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-white text-sm font-medium">{prof.nome}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${vinculoStyle[prof.vinculo]}`}>
                  {vinculoLabel[prof.vinculo]}
                </span>
              </div>
              <div className="text-zinc-500 text-xs">{prof.email} · {prof.telefone}</div>
            </div>

            {/* Comissão */}
            <div className="text-right flex-shrink-0">
              <div className="text-amber-400 font-bold text-sm">{prof.comissao}</div>
              <div className="text-zinc-600 text-xs">
                {prof.vinculo === "MEI" ? "comissão + bancada" :
                 prof.vinculo === "SOLO" ? "PIX direto" : "de comissão"}
              </div>
            </div>

            {/* Status */}
            <div className="flex-shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                Ativo
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* Aviso Lei Salão Parceiro */}
      <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-1">Lei do Salão Parceiro · Lei 13.352/2016</div>
        <div className="text-zinc-400 text-sm">Profissionais MEI têm gestão adaptada à legislação brasileira. O sistema calcula taxa de bancada e gera relatório para emissão de NF no CNPJ do profissional.</div>
      </div>

      {/* Modal novo profissional */}
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

              {/* Tipo de vínculo */}
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

              {/* Comissão */}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  Comissão (%)
                </label>
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

              {/* Taxa de bancada — só para MEI */}
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

              {/* Zona de atendimento — só para SOLO */}
              {vinculo === "SOLO" && (
                <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3">
                  <div className="text-teal-400 text-xs font-mono mb-1">🚗 Autônomo domicílio</div>
                  <p className="text-zinc-500 text-xs">PIX vai 100% direto para este profissional. Configure a zona de atendimento depois no perfil.</p>
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
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cadastrar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}