"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const rotaMock = [
  { id: "1", ordem: 1, cliente: "Beatriz Rocha", endereco: "Rua das Flores, 123 — Pinheiros", servico: "Esmaltação", hora: "09:00", distancia: "2.3 km", status: "CONCLUIDO" },
  { id: "2", ordem: 2, cliente: "Carla Dias", endereco: "Av. Paulista, 456 — Bela Vista", servico: "Escova + Hidratação", hora: "11:00", distancia: "4.1 km", status: "EM_ROTA" },
  { id: "3", ordem: 3, cliente: "Fernanda Lima", endereco: "Rua Augusta, 789 — Consolação", servico: "Manicure", hora: "14:00", distancia: "1.8 km", status: "AGENDADO" },
  { id: "4", ordem: 4, cliente: "Juliana Costa", endereco: "Rua Oscar Freire, 321 — Jardins", servico: "Progressiva", hora: "16:30", distancia: "3.2 km", status: "AGENDADO" },
]

const kitMock = [
  { id: "1", nome: "Acetona", quantidade: 1, minimo: 2, unidade: "frasco" },
  { id: "2", nome: "Esmalte base", quantidade: 3, minimo: 2, unidade: "un" },
  { id: "3", nome: "Lixa descartável", quantidade: 12, minimo: 10, unidade: "un" },
  { id: "4", nome: "Palito de madeira", quantidade: 5, minimo: 10, unidade: "un" },
  { id: "5", nome: "Algodão", quantidade: 1, minimo: 1, unidade: "rolo" },
]

const statusStyle: Record<string, string> = {
  CONCLUIDO: "bg-green-500/10 text-green-400 border border-green-500/20",
  EM_ROTA: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  AGENDADO: "bg-zinc-700 text-zinc-400 border border-zinc-600",
}

const statusLabel: Record<string, string> = {
  CONCLUIDO: "✓ Concluído",
  EM_ROTA: "🚗 Em rota",
  AGENDADO: "📅 Agendado",
}

export default function DomicilioPage() {
  const [aba, setAba] = useState<"rota" | "kit" | "zona">("rota")
  const [zonaKm, setZonaKm] = useState(15)

  const concluidos = rotaMock.filter(r => r.status === "CONCLUIDO").length
  const totalKm = rotaMock.reduce((s, r) => s + parseFloat(r.distancia), 0)
  const kitCritico = kitMock.filter(k => k.quantidade < k.minimo).length

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">🚗 Atendimento a Domicílio</h1>
          <p className="text-zinc-500 text-sm">MOD-09 · Rota do dia · Kit pessoal · Zona de atendimento</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
            Marina Nunes · Autônoma
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
          <div className="text-teal-400 text-xs font-mono uppercase tracking-widest mb-1">Rota de hoje</div>
          <div className="text-teal-400 text-2xl font-bold">{concluidos}/{rotaMock.length}</div>
          <div className="text-zinc-500 text-xs mt-1">atendimentos concluídos</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Distância total</div>
          <div className="text-white text-2xl font-bold">{totalKm.toFixed(1)} km</div>
          <div className="text-zinc-600 text-xs mt-1">percurso do dia</div>
        </div>
        <div className={`rounded-xl p-4 border ${kitCritico > 0 ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800"}`}>
          <div className={`text-xs uppercase tracking-wide mb-1 ${kitCritico > 0 ? "text-red-400" : "text-zinc-500"}`}>
            {kitCritico > 0 ? "⚠ Kit crítico" : "Kit pessoal"}
          </div>
          <div className={`text-2xl font-bold ${kitCritico > 0 ? "text-red-400" : "text-green-400"}`}>
            {kitCritico > 0 ? `${kitCritico} itens` : "OK"}
          </div>
          <div className="text-zinc-600 text-xs mt-1">{kitCritico > 0 ? "abaixo do mínimo" : "todos os itens OK"}</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "rota", label: "🗺️ Rota do dia" },
          { id: "kit", label: "🧳 Kit pessoal" },
          { id: "zona", label: "⭕ Zona de atendimento" },
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

      {/* Aba Rota */}
      {aba === "rota" && (
        <div className="space-y-3">
          {rotaMock.map((item) => (
            <div
              key={item.id}
              className={`bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 ${
                item.status === "EM_ROTA" ? "border-amber-500/25 bg-amber-500/3" : "border-zinc-800"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                item.status === "CONCLUIDO" ? "bg-green-500 text-white" :
                item.status === "EM_ROTA" ? "bg-amber-500 text-black" :
                "bg-zinc-700 text-zinc-400"
              }`}>
                {item.status === "CONCLUIDO" ? "✓" : item.ordem}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-medium">{item.cliente}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[item.status]}`}>
                    {statusLabel[item.status]}
                  </span>
                </div>
                <div className="text-zinc-500 text-xs">{item.servico} · {item.hora}</div>
                <div className="text-teal-400 text-xs mt-0.5">{item.endereco}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-zinc-400 text-sm">{item.distancia}</div>
                {item.status === "AGENDADO" && (
                  <button className="text-xs text-teal-400 hover:text-teal-300 mt-1 transition-colors">
                    💸 PIX direto
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aba Kit */}
      {aba === "kit" && (
        <div>
          {kitCritico > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mb-3 flex items-center gap-3">
              <span className="text-red-400 text-base">⚠</span>
              <div>
                <div className="text-red-400 text-sm font-medium">{kitCritico} itens abaixo do mínimo antes da rota</div>
                <div className="text-zinc-500 text-xs">Reponha antes de sair para o primeiro atendimento</div>
              </div>
            </div>
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Item</th>
                  <th className="text-center px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Quantidade</th>
                  <th className="text-center px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Mínimo</th>
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {kitMock.map((item, i) => {
                  const critico = item.quantidade < item.minimo
                  return (
                    <tr key={item.id} className={`border-b border-zinc-800 ${i === kitMock.length - 1 ? "border-0" : ""}`}>
                      <td className="px-4 py-3 text-white text-sm">{item.nome}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${critico ? "text-red-400" : "text-white"}`}>
                          {item.quantidade} {item.unidade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-500 text-sm">{item.minimo}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          critico
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-green-500/10 text-green-400 border border-green-500/20"
                        }`}>
                          {critico ? "⚠ Repor" : "✓ OK"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba Zona */}
      {aba === "zona" && (
        <div className="max-w-lg">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Raio de atendimento</div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400 text-sm">Distância máxima</span>
                <span className="text-teal-400 font-bold">{zonaKm} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={zonaKm}
                onChange={(e) => setZonaKm(parseInt(e.target.value))}
                className="w-full accent-teal-500"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>

            <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3">
              <div className="text-teal-400 text-xs font-mono mb-1">Link de agendamento pessoal</div>
              <div className="text-white text-sm font-mono">barberos.com/marina-nunes</div>
              <div className="text-zinc-500 text-xs mt-1">Clientes fora do raio de {zonaKm}km não conseguem agendar</div>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Bairros aceitos (opcional)</label>
              <textarea
                rows={3}
                placeholder="Ex: Pinheiros, Vila Madalena, Jardins, Consolação..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors placeholder:text-zinc-600 resize-none"
              />
            </div>

            <button className="w-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold px-4 py-2.5 rounded-lg text-sm border border-teal-500/20 transition-colors">
              Salvar zona de atendimento
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}