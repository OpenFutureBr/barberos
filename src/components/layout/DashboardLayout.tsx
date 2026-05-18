"use client"

import { useState, useEffect } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import AgendaModal from "./AgendaModal"
import VendaModal, { type CartItem } from "./VendaModal"
import PagamentoModal, { type DadosPagamento } from "./PagamentoModal"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [modalAgendaAberto, setModalAgendaAberto] = useState(false)
  const [modalVendaAberto, setModalVendaAberto] = useState(false)
  const [dadosPagamento, setDadosPagamento] = useState<DadosPagamento | null>(null)
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    try { setIsLight(localStorage.getItem("tema") === "light") } catch {}
    function onTema(e: Event) { setIsLight((e as CustomEvent).detail === "light") }
    window.addEventListener("temaAlterado", onTema)
    return () => window.removeEventListener("temaAlterado", onTema)
  }, [])

  // Carrinho persistente — não some ao fechar o modal
  const [cartItens, setCartItens] = useState<CartItem[]>([])
  const cartCount = cartItens.reduce((s, i) => s + i.qty, 0)

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

  useEffect(() => {
    function handleAgenda() { setModalAgendaAberto(true) }
    function handleVenda() { setModalVendaAberto(true) }
    function handlePagamento(e: Event) { setDadosPagamento((e as CustomEvent).detail) }
    window.addEventListener("abrirModalAgenda", handleAgenda)
    window.addEventListener("abrirVenda", handleVenda)
    window.addEventListener("abrirPagamento", handlePagamento)
    return () => {
      window.removeEventListener("abrirModalAgenda", handleAgenda)
      window.removeEventListener("abrirVenda", handleVenda)
      window.removeEventListener("abrirPagamento", handlePagamento)
    }
  }, [])

  return (
    <div
      className="min-h-screen bg-zinc-950"
      style={{ filter: isLight ? "invert(1) hue-rotate(180deg)" : "none", transition: "filter 0.35s ease" }}
    >
      <Sidebar />
      <Topbar
        onAbrirModal={() => setModalAgendaAberto(true)}
        onAbrirVenda={() => setModalVendaAberto(true)}
        cartCount={cartCount}
      />
      <main className="ml-48 pt-11 min-h-screen">
        <div className="p-4">{children}</div>
      </main>
      <AgendaModal
        aberto={modalAgendaAberto}
        onFechar={() => setModalAgendaAberto(false)}
        dadosPreCarregados={dadosModal}
      />
      <VendaModal
        aberto={modalVendaAberto}
        onFechar={() => setModalVendaAberto(false)}
        itens={cartItens}
        setItens={setCartItens}
      />
      <PagamentoModal
        dados={dadosPagamento}
        onFechar={() => setDadosPagamento(null)}
        onConfirmado={(id) => window.dispatchEvent(new CustomEvent("pagamentoConfirmado", { detail: id }))}
      />
    </div>
  )
}
