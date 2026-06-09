"use client"

import { useState, useEffect, useRef } from "react"
import { setCache } from "@/lib/prefetch-cache"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import AgendaModal from "./AgendaModal"
import VendaModal, { type CartItem } from "./VendaModal"
import PagamentoModal, { type DadosPagamento } from "./PagamentoModal"
import GlobalFAB from "./GlobalFAB"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [modalAgendaAberto, setModalAgendaAberto] = useState(false)
  const [modalVendaAberto, setModalVendaAberto] = useState(false)
  const [dadosPagamento, setDadosPagamento] = useState<DadosPagamento | null>(null)
  // Prefetch silencioso de dados frequentes ao carregar o dashboard
  useEffect(() => {
    // Clientes (primeira página) — maior gargalo atual
    fetch("/api/clientes?page=1&perPage=30")
      .then(r => r.json())
      .then(d => { if (!d.error) setCache("clientes:1:30:", d) })
      .catch(() => {})
    // Configurações (usada em muitos modais)
    fetch("/api/configuracoes")
      .then(r => r.json())
      .then(d => { if (!d.error) setCache("configuracoes", d) })
      .catch(() => {})
  }, [])

  // Carrinho persistente — não some ao fechar o modal
  const [cartItens, setCartItens] = useState<CartItem[]>([])
  const cartCount = cartItens.reduce((s, i) => s + i.qty, 0)

  const [dadosModal, setDadosModal] = useState<{
    profissionais: any[]
    clientes: any[]
    servicos: any[]
  } | null>(null)
  const carregadoRef = useRef(false)

  // Carrega dados apenas quando o modal for aberto pela primeira vez
  function carregarDadosModal() {
    if (carregadoRef.current) return
    carregadoRef.current = true
    Promise.all([
      fetch("/api/equipe").then(r => r.json()),
      fetch("/api/clientes?modo=simples").then(r => r.json()), // só id, name, phone
      fetch("/api/servicos").then(r => r.json()),
    ]).then(([profs, cls, svcs]) => {
      setDadosModal({
        profissionais: Array.isArray(profs) ? profs : [],
        clientes: Array.isArray(cls) ? cls : [],
        servicos: Array.isArray(svcs) ? svcs : [],
      })
    }).catch(console.error)
  }

  useEffect(() => {
    function handleAgenda() { carregarDadosModal(); setModalAgendaAberto(true) }
    function handleVenda() { carregarDadosModal(); setModalVendaAberto(true) }
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
    <div className="min-h-screen bg-zinc-950">
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
        endpointOverride={dadosPagamento?.appointmentId?.startsWith("venda-") ? "/api/venda" : undefined}
        onConfirmado={(id) => { window.dispatchEvent(new CustomEvent("pagamentoConfirmado", { detail: id })); setDadosPagamento(null) }}
      />
      <GlobalFAB />
    </div>
  )
}
