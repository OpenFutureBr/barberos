"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const unidadesMock = [
  {
    id: "1",
    nome: "Barbearia Costa — Vila Madalena",
    cidade: "São Paulo · SP",
    slug: "barbearia-costa-vm",
    plano: "PRO",
    status: "ABERTA",
    profissionais: 5,
    clientesAtivos: 247,
    faturamentoMes: 28450,
    ticketMedio: 95,
    atendimentosHoje: 12,
    avaliacaoMedia: 4.8,
  },
  {
    id: "2",
    nome: "Barbearia Costa — Pinheiros",
    cidade: "São Paulo · SP",
    slug: "barbearia-costa-ph",
    plano: "PRO",
    status: "ABERTA",
    profissionais: 3,
    clientesAtivos: 134,
    faturamentoMes: 15200,
    ticketMedio: 85,
    atendimentosHoje: 7,
    avaliacaoMedia: 4.6,
  },
  {
    id: "3",
    nome: "Barbearia Costa — Itaim Bibi",
    cidade: "São Paulo · SP",
    slug: "barbearia-costa-ib",
    plano: "START",
    status: "FECHADA",
    profissionais: 2,
    clientesAtivos: 89,
    faturamentoMes: 8900,
    ticketMedio: 75,
    atendimentosHoje: 0,
    avaliacaoMedia: 4.5,
  },
]

const planoStyle: Record<string, string> = {
  PRO: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  BUSINESS: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  START: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
}

export default function UnidadesPage() {
  const [unidadeSel, setUnidadeSel] = useState<string | null>(null)
  const [modalNova, setModalNova] = useState(false)

  const totalFaturamento = unidadesMock.reduce((s, u) => s + u.faturamentoMes, 0)
  const totalClientes = unidadesMock.reduce((s, u) => s + u.clientesAtivos, 0)
  const totalProfissionais = unidadesMock.reduce((s, u) => s + u.profissionais, 0)
  const totalAtendimentos = unidadesMock.reduce((s, u) => s + u.atendimentosHoje, 0)

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Multi-unidades</h1>
          <p className="text-zinc-500 text-sm">{unidadesMock.length} unidades · Dashboard consolidado</p>
        </div>
        <button
          onClick={() => setModalNova(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Nova unidade
        </button>
      </div>

      {/* KPIs consolidados */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Consolidado — todas as unidades</div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-zinc-500 text-xs mb-1">Faturamento total/mês</div>
            <div className="text-green-400 text-2xl font-bold">R$ {totalFaturamento.toLocaleString("pt-BR")}</div>
          </div>
          <div>
            <div className="text-zinc-500 text-xs mb-1">Clientes ativos</div>
            <div className="text-blue-400 text-2xl font-bold">{totalClientes}</div>
          </div>
          <div>
            <div className="text-zinc-500 text-xs mb-1">Profissionais</div>
            <div className="text-purple-400 text-2xl font-bold">{totalProfissionais}</div>
          </div>
          <div>
            <div className="text-zinc-500 text-xs mb-1">Atendimentos hoje</div>
            <div className="text-amber-400 text-2xl font-bold">{totalAtendimentos}</div>
          </div>
        </div>
      </div>

      {/* Cards das unidades */}
      <div className="space-y-3">
        {unidadesMock.map((unidade) => (
          <div
            key={unidade.id}
            className={`bg-zinc-900 border rounded-xl overflow-hidden cursor-pointer transition-all ${
              unidadeSel === unidade.id
                ? "border-amber-500/40"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
            onClick={() => setUnidadeSel(unidadeSel === unidade.id ? null : unidade.id)}
          >
            {/* Header da unidade */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold">B</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-medium">{unidade.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${planoStyle[unidade.plano]}`}>
                    {unidade.plano}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    unidade.status === "ABERTA"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-zinc-700 text-zinc-400 border border-zinc-600"
                  }`}>
                    {unidade.status === "ABERTA" ? "● Aberta" : "○ Fechada"}
                  </span>
                </div>
                <div className="text-zinc-500 text-xs">{unidade.cidade} · {unidade.slug}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-green-400 font-bold">R$ {unidade.faturamentoMes.toLocaleString("pt-BR")}</div>
                <div className="text-zinc-600 text-xs">este mês</div>
              </div>
              <div className="text-zinc-500 text-sm flex-shrink-0">
                {unidadeSel === unidade.id ? "▲" : "▼"}
              </div>
            </div>

            {/* Detalhe expandido */}
            {unidadeSel === unidade.id && (
              <div className="border-t border-zinc-800 p-4">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-zinc-500 text-xs mb-1">Profissionais</div>
                    <div className="text-white font-bold text-lg">{unidade.profissionais}</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-zinc-500 text-xs mb-1">Clientes</div>
                    <div className="text-white font-bold text-lg">{unidade.clientesAtivos}</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-zinc-500 text-xs mb-1">Ticket médio</div>
                    <div className="text-amber-400 font-bold text-lg">R$ {unidade.ticketMedio}</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-zinc-500 text-xs mb-1">Avaliação</div>
                    <div className="text-yellow-400 font-bold text-lg">★ {unidade.avaliacaoMedia}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-4 py-2 rounded-lg border border-zinc-700 transition-colors">
                    Ver dashboard
                  </button>
                  <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-4 py-2 rounded-lg border border-zinc-700 transition-colors">
                    Gerenciar equipe
                  </button>
                  <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-4 py-2 rounded-lg border border-zinc-700 transition-colors">
                    Configurações
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal nova unidade */}
      {modalNova && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Nova Unidade</h2>
              <button onClick={() => setModalNova(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome da unidade *</label>
                <input placeholder="Ex: Barbearia Costa — Moema" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Cidade *</label>
                <input placeholder="Ex: São Paulo · SP" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Plano</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                  <option>START — R$ 49/mês</option>
                  <option>PRO — R$ 149/mês</option>
                  <option>BUSINESS — R$ 399/mês</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalNova(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button onClick={() => setModalNova(false)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">Criar unidade</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}