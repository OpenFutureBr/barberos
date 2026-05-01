"use client"

import { useState, useEffect } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import AgendaModal from "./AgendaModal"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [modalAberto, setModalAberto] = useState(false)
  const [dadosModal, setDadosModal] = useState<{
    profissionais: any[]
    clientes: any[]
    servicos: any[]
  } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/equipe").then(r => r.json()),
      fetch("/api/clientes").then(r => r.json()),
      fetch("/api/servicos").then(r => r.json()),
    ]).then(([profs, cls, svcs]) => {
      setDadosModal({
        profissionais: Array.isArray(profs) ? profs : [],
        clientes: Array.isArray(cls) ? cls : [],
        servicos: Array.isArray(svcs) ? svcs : [],
      })
    }).catch(console.error)
  }, [])

  // ← NOVO: escuta clique em slot vazio da grade
  useEffect(() => {
    function handleSlotEvento() {
      setModalAberto(true)
    }
    window.addEventListener("abrirModalAgenda", handleSlotEvento)
    return () => window.removeEventListener("abrirModalAgenda", handleSlotEvento)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />
      <Topbar onAbrirModal={() => setModalAberto(true)} />
      <main className="ml-48 pt-11 min-h-screen">
        <div className="p-4">{children}</div>
      </main>
      <AgendaModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        dadosPreCarregados={dadosModal}
      />
    </div>
  )
}