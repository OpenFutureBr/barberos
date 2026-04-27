"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const profissionais = [
  { id: "1", nome: "Lucas", iniciais: "LC", cor: "bg-blue-600" },
  { id: "2", nome: "Ana", iniciais: "AS", cor: "bg-purple-600" },
  { id: "3", nome: "Miguel", iniciais: "MF", cor: "bg-teal-600" },
  { id: "4", nome: "Rafael", iniciais: "RF", cor: "bg-amber-600" },
]

const agendamentos = [
  { id: "1", hora: "09:00", profId: "1", cliente: "Pedro Silva", servico: "Corte + Barba", tipo: "presencial", duracao: 2 },
  { id: "2", hora: "09:00", profId: "3", cliente: "Isabela Mota", servico: "Escova", tipo: "presencial", duracao: 2 },
  { id: "3", hora: "10:00", profId: "2", cliente: "Carla Dias", servico: "Progressiva", tipo: "presencial", duracao: 3 },
  { id: "4", hora: "10:00", profId: "4", cliente: "André Nogueira", servico: "Corte", tipo: "presencial", duracao: 1 },
  { id: "5", hora: "11:00", profId: "1", cliente: "Felipe Gomes ★", servico: "Corte VIP", tipo: "presencial", duracao: 1 },
  { id: "6", hora: "14:00", profId: "1", cliente: "João Ribeiro", servico: "Corte + Barba", tipo: "presencial", duracao: 2 },
  { id: "7", hora: "14:00", profId: "2", cliente: "Beatriz Rocha", servico: "Esmaltação", tipo: "domicilio", duracao: 1 },
  { id: "8", hora: "15:00", profId: "2", cliente: "Mateus Alves", servico: "Progressiva", tipo: "presencial", duracao: 3 },
  { id: "9", hora: "15:00", profId: "4", cliente: "Diego Ramos", servico: "Corte", tipo: "presencial", duracao: 1 },
  { id: "10", hora: "16:00", profId: "1", cliente: "Felipe Gomes", servico: "Corte", tipo: "presencial", duracao: 1 },
]

const horas = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"]
const horaAtual = "14:00"

const corAppt: Record<string, string> = {
  presencial: "bg-amber-500/15 border-l-2 border-amber-500 text-amber-200",
  domicilio: "bg-teal-500/15 border-l-2 border-teal-500 text-teal-200",
}

export default function AgendaPage() {
  const [modalAberto, setModalAberto] = useState(false)
  const [slotSelecionado, setSlotSelecionado] = useState<{hora: string, profId: string} | null>(null)
  const [apptSelecionado, setApptSelecionado] = useState<typeof agendamentos[0] | null>(null)
  const [modalDetalhe, setModalDetalhe] = useState(false)
  const [tipoAtendimento, setTipoAtendimento] = useState("presencial")

  function getAgendamento(hora: string, profId: string) {
    return agendamentos.find((a) => a.hora === hora && a.profId === profId)
  }

  function handleSlotClick(hora: string, profId: string) {
    const appt = getAgendamento(hora, profId)
    if (appt) {
      setApptSelecionado(appt)
      setModalDetalhe(true)
    } else {
      setSlotSelecionado({ hora, profId })
      setModalAberto(true)
    }
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Agenda</h1>
          <p className="text-zinc-500 text-sm">Domingo, 05 de Abril de 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-sm border border-zinc-700 transition-colors">← Ant.</button>
          <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-sm border border-zinc-700 transition-colors">Próx. →</button>
          <button onClick={() => setModalAberto(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            + Agendar
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Presencial</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span> Domicílio 🚗</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-600"></span> Disponível</span>
        <span className="ml-auto text-amber-400">◈ Linha dourada = agora (14h00)</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="grid border-b border-zinc-800" style={{ gridTemplateColumns: "56px repeat(4, 1fr)" }}>
          <div className="p-2 text-zinc-600 text-xs font-mono text-center border-r border-zinc-800">H</div>
          {profissionais.map((prof) => (
            <div key={prof.id} className="p-2 flex flex-col items-center gap-1 border-r border-zinc-800 last:border-0">
              <div className={`w-6 h-6 rounded-full ${prof.cor} flex items-center justify-center text-xs font-bold text-white`}>
                {prof.iniciais[0]}
              </div>
              <span className="text-zinc-300 text-xs">{prof.nome}</span>
            </div>
          ))}
        </div>

        {horas.map((hora) => {
          const isNow = hora === horaAtual
          return (
            <div
              key={hora}
              className={`grid border-b border-zinc-800 last:border-0 ${isNow ? "bg-amber-500/5" : ""}`}
              style={{ gridTemplateColumns: "56px repeat(4, 1fr)" }}
            >
              <div className={`p-2 text-xs font-mono border-r border-zinc-800 flex items-start justify-center pt-2 ${isNow ? "text-amber-400" : "text-zinc-600"}`}>
                {hora}
              </div>
              {profissionais.map((prof) => {
                const appt = getAgendamento(hora, prof.id)
                return (
                  <div
                    key={prof.id}
                    className="border-r border-zinc-800 last:border-0 p-1 min-h-[52px] cursor-pointer"
                    onClick={() => handleSlotClick(hora, prof.id)}
                  >
                    {appt ? (
                      <div className={`rounded p-1.5 h-full ${corAppt[appt.tipo]}`}>
                        <div className="text-xs font-semibold leading-tight">{appt.cliente}</div>
                        <div className="text-xs opacity-60 mt-0.5">{appt.servico}</div>
                        {appt.tipo === "domicilio" && <div className="text-xs mt-0.5">🚗</div>}
                      </div>
                    ) : (
                      <div className="h-full rounded hover:bg-zinc-800/50 transition-colors"></div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Modal novo agendamento */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Novo Agendamento</h2>
              <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {slotSelecionado && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400 text-sm">
                  ◈ {slotSelecionado.hora} · {profissionais.find(p => p.id === slotSelecionado.profId)?.nome}
                </div>
              )}
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Cliente *</label>
                <input placeholder="Buscar cliente..." className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Serviço *</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                  <option>Corte de Cabelo — R$ 65 · 40min</option>
                  <option>Corte + Barba — R$ 95 · 60min</option>
                  <option>Barba Completa — R$ 45 · 30min</option>
                  <option>Progressiva — R$ 180 · 120min</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Tipo de atendimento</label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setTipoAtendimento("presencial")}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      tipoAtendimento === "presencial"
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-amber-500/20"
                    }`}
                  >
                    <span className={`text-xs font-medium ${tipoAtendimento === "presencial" ? "text-amber-400" : "text-zinc-400"}`}>
                      🏪 Presencial
                    </span>
                  </div>
                  <div
                    onClick={() => setTipoAtendimento("domicilio")}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      tipoAtendimento === "domicilio"
                        ? "border-teal-500/30 bg-teal-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-teal-500/20"
                    }`}
                  >
                    <span className={`text-xs font-medium ${tipoAtendimento === "domicilio" ? "text-teal-400" : "text-zinc-400"}`}>
                      🚗 Domicílio
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalAberto(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button onClick={() => setModalAberto(false)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe agendamento */}
      {modalDetalhe && apptSelecionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Detalhes do Agendamento</h2>
              <button onClick={() => setModalDetalhe(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className={`rounded-xl p-4 ${corAppt[apptSelecionado.tipo]}`}>
                <div className="text-base font-bold mb-1">{apptSelecionado.cliente}</div>
                <div className="text-sm opacity-70">{apptSelecionado.servico}</div>
                <div className="text-sm opacity-70 mt-1">
                  ⏰ {apptSelecionado.hora} · {apptSelecionado.tipo === "domicilio" ? "🚗 Domicílio" : "🏪 Presencial"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Profissional</div>
                  <div className="text-white text-sm font-medium">
                    {profissionais.find(p => p.id === apptSelecionado.profId)?.nome}
                  </div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Status</div>
                  <div className="text-green-400 text-sm font-medium">Confirmado</div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setModalDetalhe(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setModalDetalhe(false)
                    setSlotSelecionado({ hora: apptSelecionado.hora, profId: apptSelecionado.profId })
                    setModalAberto(true)
                  }}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium px-4 py-2.5 rounded-lg text-sm border border-blue-500/20 transition-colors"
                >
                  ✏️ Editar
                </button>
                <button onClick={() => setModalDetalhe(false)} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2.5 rounded-lg text-sm border border-red-500/20 transition-colors">
                  ✕ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}