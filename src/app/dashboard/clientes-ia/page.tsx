"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const clientesIA = [
  { id: "1", nome: "Felipe Gomes", telefone: "(11) 99874-3312", visitas: 18, ticket: 95, intervalo: 21, diasSemVisita: 5, segmento: "VIP", risco: 0, cashback: 47, totalGasto: 1890 },
  { id: "2", nome: "Pedro Silva", telefone: "(11) 98765-4321", visitas: 9, ticket: 65, intervalo: 28, diasSemVisita: 12, segmento: "REGULAR", risco: 20, cashback: 31, totalGasto: 720 },
  { id: "3", nome: "Carlos Souza", telefone: "(11) 97654-3210", visitas: 15, ticket: 80, intervalo: 21, diasSemVisita: 41, segmento: "AT_RISK", risco: 85, cashback: 0, totalGasto: 1240 },
  { id: "4", nome: "Marcos Andrade", telefone: "(11) 95432-1098", visitas: 7, ticket: 70, intervalo: 21, diasSemVisita: 32, segmento: "AT_RISK", risco: 72, cashback: 0, totalGasto: 490 },
  { id: "5", nome: "João Ribeiro", telefone: "(11) 96543-2109", visitas: 3, ticket: 55, intervalo: 30, diasSemVisita: 8, segmento: "NEW", risco: 10, cashback: 19, totalGasto: 185 },
  { id: "6", nome: "Bruno Melo", telefone: "(11) 94321-0987", visitas: 1, ticket: 40, intervalo: 0, diasSemVisita: 45, segmento: "INACTIVE", risco: 95, cashback: 0, totalGasto: 40 },
  { id: "7", nome: "André Nogueira", telefone: "(11) 93210-9876", visitas: 5, ticket: 65, intervalo: 25, diasSemVisita: 18, segmento: "REGULAR", risco: 15, cashback: 12, totalGasto: 325 },
  { id: "8", nome: "Diego Ramos", telefone: "(11) 92109-8765", visitas: 2, ticket: 55, intervalo: 35, diasSemVisita: 28, segmento: "NEW", risco: 30, cashback: 5, totalGasto: 110 },
]

const segmentoConfig: Record<string, { label: string, style: string, icon: string }> = {
  VIP: { label: "VIP", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20", icon: "★" },
  REGULAR: { label: "Regular", style: "bg-green-500/10 text-green-400 border border-green-500/20", icon: "●" },
  AT_RISK: { label: "Em risco", style: "bg-red-500/10 text-red-400 border border-red-500/20", icon: "⚠" },
  NEW: { label: "Novo", style: "bg-blue-500/10 text-blue-400 border border-blue-500/20", icon: "◆" },
  INACTIVE: { label: "Inativo", style: "bg-zinc-700 text-zinc-400 border border-zinc-600", icon: "○" },
}

export default function ClientesIAPage() {
  const [filtro, setFiltro] = useState("TODOS")
  const [ordenar, setOrdenar] = useState("risco")

  const filtrados = clientesIA
    .filter(c => filtro === "TODOS" || c.segmento === filtro)
    .sort((a, b) => {
      if (ordenar === "risco") return b.risco - a.risco
      if (ordenar === "ticket") return b.ticket - a.ticket
      if (ordenar === "visitas") return b.visitas - a.visitas
      if (ordenar === "gasto") return b.totalGasto - a.totalGasto
      return 0
    })

  const vips = clientesIA.filter(c => c.segmento === "VIP").length
  const emRisco = clientesIA.filter(c => c.segmento === "AT_RISK").length
  const inativos = clientesIA.filter(c => c.segmento === "INACTIVE").length
  const ticketMedio = Math.round(clientesIA.reduce((s, c) => s + c.ticket, 0) / clientesIA.length)

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">⬡ IA — Ranking de Clientes</h1>
          <p className="text-zinc-500 text-sm">Segmentação automática · Score de risco · Ações inteligentes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-amber-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Clientes VIP</div>
          <div className="text-amber-400 text-2xl font-bold">{vips}</div>
          <div className="text-zinc-600 text-xs mt-1">alta frequência e valor</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-red-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Em risco</div>
          <div className="text-red-400 text-2xl font-bold">{emRisco}</div>
          <div className="text-zinc-600 text-xs mt-1">acima do intervalo habitual</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-zinc-600">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Inativos</div>
          <div className="text-zinc-400 text-2xl font-bold">{inativos}</div>
          <div className="text-zinc-600 text-xs mt-1">sem visita há muito tempo</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-blue-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Ticket médio</div>
          <div className="text-blue-400 text-2xl font-bold">R$ {ticketMedio}</div>
          <div className="text-zinc-600 text-xs mt-1">média geral da base</div>
        </div>
      </div>

      {/* Filtros e ordenação */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {["TODOS", "VIP", "REGULAR", "AT_RISK", "NEW", "INACTIVE"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filtro === f
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {f === "TODOS" ? "Todos" : f === "AT_RISK" ? "Em risco" : f === "NEW" ? "Novos" : f === "INACTIVE" ? "Inativos" : f}
            </button>
          ))}
        </div>
        <select
          value={ordenar}
          onChange={(e) => setOrdenar(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg px-3 py-1.5 text-xs outline-none"
        >
          <option value="risco">Ordenar por risco</option>
          <option value="ticket">Ordenar por ticket</option>
          <option value="visitas">Ordenar por visitas</option>
          <option value="gasto">Ordenar por gasto total</option>
        </select>
      </div>

      {/* Lista de clientes */}
      <div className="space-y-2">
        {filtrados.map((cliente, i) => {
          const seg = segmentoConfig[cliente.segmento]
          return (
            <div
              key={cliente.id}
              className={`bg-zinc-900 border rounded-xl p-4 transition-all hover:border-zinc-700 ${
                cliente.risco >= 70 ? "border-red-500/20" : "border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-4">

                {/* Posição */}
                <div className="text-zinc-600 font-mono text-sm w-6 text-center flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {cliente.nome.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white text-sm font-medium">{cliente.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${seg.style}`}>
                      {seg.icon} {seg.label}
                    </span>
                  </div>
                  <div className="text-zinc-500 text-xs">{cliente.telefone} · {cliente.visitas} visitas · R$ {cliente.totalGasto} total gasto</div>
                </div>

                {/* Score de risco */}
                <div className="flex-shrink-0 text-center w-20">
                  <div className="text-xs text-zinc-600 mb-1">Score risco</div>
                  <div className={`text-lg font-bold ${
                    cliente.risco >= 70 ? "text-red-400" :
                    cliente.risco >= 40 ? "text-amber-400" :
                    "text-green-400"
                  }`}>{cliente.risco}%</div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        cliente.risco >= 70 ? "bg-red-500" :
                        cliente.risco >= 40 ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${cliente.risco}%` }}
                    ></div>
                  </div>
                </div>

                {/* Dias sem visita */}
                <div className="flex-shrink-0 text-center w-20">
                  <div className="text-xs text-zinc-600 mb-1">Sem visita</div>
                  <div className={`text-lg font-bold ${cliente.diasSemVisita > cliente.intervalo ? "text-red-400" : "text-zinc-300"}`}>
                    {cliente.diasSemVisita}d
                  </div>
                  <div className="text-xs text-zinc-600">intervalo: {cliente.intervalo || "—"}d</div>
                </div>

                {/* Ação */}
                <div className="flex-shrink-0">
                  {cliente.risco >= 70 ? (
                    <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/20 transition-colors">
                      💬 Recuperar
                    </button>
                  ) : cliente.segmento === "VIP" ? (
                    <button className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg text-xs border border-amber-500/20 transition-colors">
                      ★ Mimar VIP
                    </button>
                  ) : (
                    <a href="/dashboard/clientes" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg text-xs border border-zinc-700 transition-colors">
                      Ver perfil →
                    </a>
                  )}
                </div>

              </div>
            </div>
          )
        })}
      </div>

      {/* Insight IA */}
      <div className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
        <div className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-2">⬡ Insight da IA</div>
        <div className="text-zinc-300 text-sm leading-relaxed">
          <strong>Carlos Souza</strong> é o cliente mais crítico — VIP histórico com 41 dias sem visita, score de risco 85%.
          Receita potencial perdida: ~R$ 380/mês. Ação recomendada: mensagem personalizada com oferta exclusiva no WhatsApp.
        </div>
      </div>

    </DashboardLayout>
  )
}