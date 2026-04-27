"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const segmentoStyle: Record<string, string> = {
  VIP: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  REGULAR: "bg-green-500/10 text-green-400 border border-green-500/20",
  AT_RISK: "bg-red-500/10 text-red-400 border border-red-500/20",
  NEW: "bg-zinc-700 text-zinc-400 border border-zinc-600",
  INACTIVE: "bg-zinc-700 text-zinc-400 border border-zinc-600",
}

const segmentoLabel: Record<string, string> = {
  VIP: "VIP",
  REGULAR: "Regular",
  AT_RISK: "Em risco",
  NEW: "Novo",
  INACTIVE: "Inativo",
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [nascimento, setNascimento] = useState("")

  useEffect(() => {
    buscarClientes()
  }, [])

  async function buscarClientes() {
    setLoading(true)
    try {
      const res = await fetch("/api/clientes")
      const data = await res.json()
      setClientes(Array.isArray(data) ? data : [])
    } catch {
      setErro("Erro ao carregar clientes")
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro("")
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, phone: telefone, email }),
        body: JSON.stringify({ name: nome, phone: telefone, email, birthDate: nascimento || null }),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      await buscarClientes()
      setModalAberto(false)
      setNome("")
      setTelefone("")
      setEmail("")
    } catch {
      setErro("Erro ao salvar cliente. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.name?.toLowerCase().includes(busca.toLowerCase()) ||
    c.phone?.includes(busca)
  )

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Clientes</h1>
          <p className="text-zinc-500 text-sm">{clientes.length} cadastrados</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Novo cliente
        </button>
      </div>

      <div className="mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Carregando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-zinc-600 text-sm mb-2">
              {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
            </div>
            {!busca && (
              <button
                onClick={() => setModalAberto(true)}
                className="text-amber-400 text-sm hover:text-amber-300 transition-colors"
              >
                Cadastrar primeiro cliente →
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Cliente</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Telefone</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Email</th>
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
                        {cliente.name?.charAt(0)}
                      </div>
                      <span className="text-white text-sm font-medium">{cliente.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{cliente.phone}</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{cliente.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${segmentoStyle[cliente.segment] ?? segmentoStyle.NEW}`}>
                      {segmentoLabel[cliente.segment] ?? "Novo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/dashboard/clientes/${cliente.id}`} className="text-zinc-600 hover:text-zinc-300 text-xs transition-colors">
                      Ver perfil →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Cliente</h2>
              <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">
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
                  {salvando ? "Salvando..." : "Cadastrar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}