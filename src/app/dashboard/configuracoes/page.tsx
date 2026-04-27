"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

export default function ConfiguracoesPage() {
  const [nome, setNome] = useState("Barbearia Costa")
  const [slug, setSlug] = useState("barbearia-costa")
  const [telefone, setTelefone] = useState("(11) 99999-9999")
  const [email, setEmail] = useState("contato@barbearia.com")
  const [endereco, setEndereco] = useState("Rua das Flores, 123")
  const [cidade, setCidade] = useState("São Paulo")
  const [estado, setEstado] = useState("SP")
  const [cep, setCep] = useState("05435-000")
  const [salvo, setSalvo] = useState(false)

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">

        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">Configurações do Estabelecimento</h1>
          <p className="text-zinc-500 text-sm mt-1">Dados da sua barbearia ou salão</p>
        </div>

        <form onSubmit={handleSalvar} className="space-y-4">

          {/* Logo */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Logo</div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold text-2xl">B</span>
              </div>
              <div>
                <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg border border-zinc-700 transition-colors cursor-pointer">
                Enviar logo
                <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => {
                  if(e.target.files?.[0]) alert(`Logo "${e.target.files[0].name}" selecionada! Na versão real será enviada para o Supabase Storage.`)
                }} />
              </label>
                <p className="text-zinc-600 text-xs mt-1">PNG ou JPG · máximo 2MB</p>
              </div>
            </div>
          </div>

          {/* Informações básicas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Informações básicas</div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Nome do estabelecimento</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Link de agendamento</label>
              <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500 transition-colors">
                <span className="text-zinc-600 text-xs px-3 border-r border-zinc-700 py-2">barberos.com/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 bg-transparent text-white px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Telefone</label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Endereço</div>

            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Endereço</label>
              <input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-zinc-400 text-xs mb-1 block">CEP</label>
                <input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="col-span-1">
                <label className="text-zinc-400 text-xs mb-1 block">Cidade</label>
                <input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="col-span-1">
                <label className="text-zinc-400 text-xs mb-1 block">Estado</label>
                <input
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Plano */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Plano atual</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-amber-400 font-bold">Plano Pro</div>
                <div className="text-zinc-500 text-xs mt-0.5">Até 5 profissionais · R$ 99–149/mês</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Ativo
              </span>
            </div>
          </div>

          {/* Botão salvar */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              Salvar alterações
            </button>
            {salvo && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                ✓ Salvo com sucesso
              </span>
            )}
          </div>

        </form>
      </div>
    </DashboardLayout>
  )
}