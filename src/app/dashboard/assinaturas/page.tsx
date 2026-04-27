"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const planosMock = [
  { id: "1", nome: "Plano Barba", descricao: "Barba ilimitada por mês", preco: 60, servicos: ["Barba Completa"], assinantes: 12, receita: 720, ativo: true },
  { id: "2", nome: "Plano Full", descricao: "Corte + barba ilimitados por mês", preco: 190, servicos: ["Corte de Cabelo", "Barba Completa"], assinantes: 6, receita: 1140, ativo: true },
  { id: "3", nome: "Plano Corte", descricao: "Corte ilimitado por mês", preco: 120, servicos: ["Corte de Cabelo"], assinantes: 0, receita: 0, ativo: false },
]

const assinantesMock = [
  { id: "1", nome: "Felipe Gomes", telefone: "(11) 99874-3312", plano: "Plano Full", valor: 190, status: "ACTIVE", renovacao: "01/05/2026" },
  { id: "2", nome: "Pedro Silva", telefone: "(11) 98765-4321", plano: "Plano Barba", valor: 60, status: "ACTIVE", renovacao: "01/05/2026" },
  { id: "3", nome: "Roberto Maia", telefone: "(11) 97654-3210", plano: "Plano Barba", valor: 60, status: "ACTIVE", renovacao: "15/05/2026" },
  { id: "4", nome: "Carlos Souza", telefone: "(11) 96543-2109", plano: "Plano Full", valor: 190, status: "OVERDUE", renovacao: "01/04/2026" },
  { id: "5", nome: "André Nogueira", telefone: "(11) 95432-1098", plano: "Plano Barba", valor: 60, status: "ACTIVE", renovacao: "10/05/2026" },
]

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-400 border border-green-500/20",
  PAUSED: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border border-red-500/20",
  OVERDUE: "bg-red-500/10 text-red-400 border border-red-500/20",
}

const statusLabel: Record<string, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  CANCELLED: "Cancelado",
  OVERDUE: "Em atraso",
}

const SERVICOS = ["Corte de Cabelo", "Barba Completa", "Hidratação", "Progressiva"]

export default function AssinaturasPage() {
  const [aba, setAba] = useState<"planos" | "assinantes">("planos")
  const [modalNovo, setModalNovo] = useState(false)
  const [nomePlano, setNomePlano] = useState("")
  const [precoPlan, setPrecoPlan] = useState("")
  const [servicosSel, setServicosSel] = useState<string[]>([])

  function toggleServico(s: string) {
    setServicosSel(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const totalReceita = planosMock.filter(p => p.ativo).reduce((s, p) => s + p.receita, 0)
  const totalAssinantes = planosMock.reduce((s, p) => s + p.assinantes, 0)
  const atrasados = assinantesMock.filter(a => a.status === "OVERDUE").length

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setModalNovo(false)
    setNomePlano("")
    setPrecoPlan("")
    setServicosSel([])
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Clube de Assinaturas</h1>
          <p className="text-zinc-500 text-sm">{totalAssinantes} assinantes · renovação automática via PIX</p>
        </div>
        <button
          onClick={() => setModalNovo(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Novo plano
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">Receita recorrente</div>
          <div className="text-green-400 text-2xl font-bold">R$ {totalReceita.toFixed(2)}</div>
          <div className="text-zinc-500 text-xs mt-1">garantido todo mês · PIX automático</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Assinantes ativos</div>
          <div className="text-blue-400 text-2xl font-bold">{totalAssinantes}</div>
          <div className="text-zinc-600 text-xs mt-1">+3 este mês</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Em atraso</div>
          <div className={`text-2xl font-bold ${atrasados > 0 ? "text-red-400" : "text-green-400"}`}>{atrasados}</div>
          <div className="text-zinc-600 text-xs mt-1">{atrasados === 0 ? "nenhum cancelamento" : "enviar cobrança"}</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "planos", label: "📋 Planos" },
          { id: "assinantes", label: "👥 Assinantes" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id as any)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              aba === tab.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aba Planos */}
      {aba === "planos" && (
        <div className="space-y-3">
          {planosMock.map((plano) => (
            <div key={plano.id} className={`bg-zinc-900 border rounded-xl overflow-hidden ${plano.ativo ? "border-zinc-700" : "border-zinc-800 opacity-60"}`}>
              <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{plano.nome}</span>
                    {!plano.ativo && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">Inativo</span>}
                  </div>
                  <div className="text-zinc-500 text-sm">{plano.descricao}</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 text-xl font-bold">R$ {plano.preco}/mês</div>
                  <div className="text-green-400 text-xs mt-0.5">R$ {plano.receita.toFixed(2)} recorrente</div>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-zinc-600 text-xs">Assinantes</div>
                    <div className="text-white font-bold">{plano.assinantes}</div>
                  </div>
                  <div>
                    <div className="text-zinc-600 text-xs">Serviços incluídos</div>
                    <div className="text-zinc-300 text-sm">{plano.servicos.join(" · ")}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalNovo(true)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setAba("assinantes")}
                    className="text-amber-400 hover:text-amber-300 text-xs px-3 py-1.5 rounded-lg border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 transition-colors"
                  >
                    + Adicionar assinante
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aba Assinantes */}
      {aba === "assinantes" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Plano</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Renovação</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {assinantesMock.map((a, i) => (
                <tr key={a.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors ${i === assinantesMock.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm font-medium">{a.nome}</div>
                    <div className="text-zinc-600 text-xs">{a.telefone}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-sm">{a.plano}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{a.renovacao}</td>
                  <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">R$ {a.valor}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[a.status]}`}>
                      {statusLabel[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "OVERDUE" ? (
                      <button className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        💬 Cobrar
                      </button>
                    ) : (
                      <button className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                        Gerenciar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal novo plano */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Plano de Assinatura</h2>
              <button onClick={() => setModalNovo(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome do plano *</label>
                <input
                  value={nomePlano}
                  onChange={(e) => setNomePlano(e.target.value)}
                  required
                  placeholder="Ex: Plano Barba Premium"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Preço mensal (R$) *</label>
                <input
                  value={precoPlan}
                  onChange={(e) => setPrecoPlan(e.target.value)}
                  required
                  type="number"
                  placeholder="Ex: 60"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Serviços incluídos</label>
                <div className="space-y-2">
                  {SERVICOS.map((s) => (
                    <div
                      key={s}
                      onClick={() => toggleServico(s)}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        servicosSel.includes(s)
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-zinc-800 border-zinc-700 hover:border-amber-500/20"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        servicosSel.includes(s) ? "bg-amber-500 border-amber-500" : "border-zinc-600"
                      }`}>
                        {servicosSel.includes(s) && <span className="text-black text-xs font-bold">✓</span>}
                      </div>
                      <span className={`text-sm ${servicosSel.includes(s) ? "text-amber-400" : "text-zinc-300"}`}>
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalNovo(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">Criar plano</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}