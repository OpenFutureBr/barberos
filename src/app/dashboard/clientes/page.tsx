"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const clientesMock = [
  { id: "1", nome: "Felipe Gomes", telefone: "(11) 99874-3312", visitas: 18, ticket: "R$ 95", status: "VIP", segmento: "vip" },
  { id: "2", nome: "Pedro Silva", telefone: "(11) 98765-4321", visitas: 9, ticket: "R$ 65", status: "Regular", segmento: "regular" },
  { id: "3", nome: "Carlos Souza", telefone: "(11) 97654-3210", visitas: 6, ticket: "R$ 80", status: "Em risco", segmento: "risco" },
  { id: "4", nome: "João Ribeiro", telefone: "(11) 96543-2109", visitas: 3, ticket: "R$ 55", status: "Novo", segmento: "novo" },
  { id: "5", nome: "Marcos Andrade", telefone: "(11) 95432-1098", visitas: 12, ticket: "R$ 70", status: "Regular", segmento: "regular" },
  { id: "6", nome: "Bruno Melo", telefone: "(11) 94321-0987", visitas: 1, ticket: "R$ 40", status: "Novo", segmento: "novo" },
]

const segmentoStyle: Record<string, string> = {
  vip: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  regular: "bg-green-500/10 text-green-400 border border-green-500/20",
  risco: "bg-red-500/10 text-red-400 border border-red-500/20",
  novo: "bg-zinc-700 text-zinc-400 border border-zinc-600",
}

export default function ClientesPage() {
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [nascimento, setNascimento] = useState("")

  const clientesFiltrados = clientesMock.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setModalAberto(false)
    setNome("")
    setTelefone("")
    setEmail("")
    setNascimento("")
  }

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Clientes</h1>
          <p className="text-zinc-500 text-sm">247 cadastrados · 9 VIPs</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Novo cliente
        </button>
      </div>

      {/* Busca */}
      <div className="mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
        />
      </div>

      {/* Tabela */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Cliente</th>
              <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Telefone</th>
              <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Visitas</th>
              <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Ticket médio</th>
              <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cliente, i) => (
              <tr key={cliente.id} className={`border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${i === clientesFiltrados.length - 1 ? "border-0" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {cliente.nome.charAt(0)}
                    </div>
                    <span className="text-white text-sm font-medium">{cliente.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-sm">{cliente.telefone}</td>
                <td className="px-4 py-3 text-zinc-400 text-sm">{cliente.visitas}</td>
                <td className="px-4 py-3 text-zinc-400 text-sm">{cliente.ticket}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${segmentoStyle[cliente.segmento]}`}>
                    {cliente.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-zinc-600 hover:text-zinc-300 text-xs transition-colors">
                    Ver perfil →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal novo cliente */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">

            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Cliente</h2>
              <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-3">

              {/* Foto */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center cursor-pointer hover:border-amber-500 transition-colors">
                  <span className="text-zinc-600 text-2xl">+</span>
                </div>
                <div>
                  <div className="text-white text-sm font-medium">Foto do cliente</div>
                  <div className="text-zinc-500 text-xs">Usado pela IA para análise de biotipo</div>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome completo *</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="Ex: João Silva"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Telefone *</label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  required
                  placeholder="(11) 99999-9999"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Data de nascimento</label>
                <input
                  type="date"
                  value={nascimento}
                  onChange={(e) => setNascimento(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>

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
                  Cadastrar cliente
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}