"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const nfesMock = [
  { id: "1", numero: "000001", cliente: "Felipe Gomes", servico: "Fade Alto + Barba", valor: 95, status: "EMITIDA", emitida: "05/04/2026 14:32", chave: "35260405000000000000550010000000011000000011" },
  { id: "2", numero: "000002", cliente: "Pedro Silva", servico: "Corte de Cabelo", valor: 65, status: "EMITIDA", emitida: "05/04/2026 13:15", chave: "35260405000000000000550010000000021000000022" },
  { id: "3", numero: "000003", cliente: "Carlos Souza", servico: "Barba Completa", valor: 45, status: "CANCELADA", emitida: "05/04/2026 12:00", chave: "35260405000000000000550010000000031000000033" },
  { id: "4", numero: "000004", cliente: "João Ribeiro", servico: "Corte + Barba", valor: 95, status: "PENDENTE", emitida: "—", chave: "—" },
]

const relatoriosMEI = [
  { id: "1", profissional: "Ana Santos", periodo: "Abril 2026", atendimentos: 18, faturamento: 2340, bancada: 800, liquido: 1540, status: "Disponível" },
  { id: "2", profissional: "Miguel Ferreira", periodo: "Abril 2026", atendimentos: 12, faturamento: 1560, bancada: 0, liquido: 1560, status: "Disponível" },
]

const statusStyle: Record<string, string> = {
  EMITIDA: "bg-green-500/10 text-green-400 border border-green-500/20",
  PENDENTE: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  CANCELADA: "bg-red-500/10 text-red-400 border border-red-500/20",
  REJEITADA: "bg-red-500/10 text-red-400 border border-red-500/20",
}

export default function FiscalPage() {
  const [aba, setAba] = useState<"nfe" | "mei" | "config">("nfe")
  const [modalEmitir, setModalEmitir] = useState(false)
  const [cliente, setCliente] = useState("")
  const [servico, setServico] = useState("")
  const [valor, setValor] = useState("")

  const totalEmitidas = nfesMock.filter(n => n.status === "EMITIDA").reduce((s, n) => s + n.valor, 0)
  const emitidas = nfesMock.filter(n => n.status === "EMITIDA").length
  const pendentes = nfesMock.filter(n => n.status === "PENDENTE").length

  function handleEmitir(e: React.FormEvent) {
    e.preventDefault()
    setModalEmitir(false)
    setCliente("")
    setServico("")
    setValor("")
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Fiscal & NF-e</h1>
          <p className="text-zinc-500 text-sm">Emissão de nota fiscal · Relatório MEI · Compliance tributário</p>
        </div>
        <button
          onClick={() => setModalEmitir(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Emitir NF-e
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-green-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">NF-e emitidas hoje</div>
          <div className="text-green-400 text-2xl font-bold">{emitidas}</div>
          <div className="text-zinc-600 text-xs mt-1">R$ {totalEmitidas.toFixed(2)} em serviços</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-amber-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Pendentes</div>
          <div className="text-amber-400 text-2xl font-bold">{pendentes}</div>
          <div className="text-zinc-600 text-xs mt-1">aguardando emissão</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-blue-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Relatórios MEI</div>
          <div className="text-blue-400 text-2xl font-bold">{relatoriosMEI.length}</div>
          <div className="text-zinc-600 text-xs mt-1">profissionais com relatório pronto</div>
        </div>
      </div>

      {/* Aviso compliance */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-4 flex items-start gap-3">
        <span className="text-blue-400 text-base flex-shrink-0">⚖️</span>
        <div>
          <div className="text-blue-400 text-sm font-medium">Compliance — Lei do Salão Parceiro</div>
          <div className="text-zinc-500 text-xs mt-0.5">O BarberOS gera relatórios para que profissionais MEI emitam NF no próprio CNPJ. O sistema não emite NF em nome do MEI — apenas facilita o processo.</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "nfe", label: "📄 NF-e Emitidas" },
          { id: "mei", label: "🪪 Relatório MEI" },
          { id: "config", label: "⚙ Configuração" },
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

      {/* Aba NF-e */}
      {aba === "nfe" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Nº</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Serviço</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Emitida</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {nfesMock.map((nfe, i) => (
                <tr key={nfe.id} className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors ${i === nfesMock.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{nfe.numero}</td>
                  <td className="px-4 py-3 text-white text-sm font-medium">{nfe.cliente}</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{nfe.servico}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{nfe.emitida}</td>
                  <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">R$ {nfe.valor}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[nfe.status]}`}>
                      {nfe.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {nfe.status === "EMITIDA" ? (
                      <button className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
                        📥 Baixar XML
                      </button>
                    ) : nfe.status === "PENDENTE" ? (
                      <button className="text-amber-400 hover:text-amber-300 text-xs transition-colors">
                        Emitir →
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba MEI */}
      {aba === "mei" && (
        <div className="space-y-3">
          {relatoriosMEI.map((rel) => (
            <div key={rel.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white font-bold">{rel.profissional}</div>
                  <div className="text-zinc-500 text-sm">{rel.periodo} · {rel.atendimentos} atendimentos</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  {rel.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Faturamento bruto</div>
                  <div className="text-white font-bold">R$ {rel.faturamento.toFixed(2)}</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Taxa de bancada</div>
                  <div className="text-red-400 font-bold">- R$ {rel.bancada.toFixed(2)}</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Líquido para NF</div>
                  <div className="text-green-400 font-bold">R$ {rel.liquido.toFixed(2)}</div>
                </div>
              </div>
              <button className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium px-4 py-2.5 rounded-lg text-sm border border-blue-500/20 transition-colors">
                📥 Baixar relatório para emissão de NF
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Aba Config */}
      {aba === "config" && (
        <div className="max-w-lg space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Dados da empresa</div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">CNPJ *</label>
              <input placeholder="00.000.000/0001-00" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Razão Social *</label>
              <input placeholder="Barbearia Costa Ltda" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Inscrição Municipal</label>
              <input placeholder="000000-0" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Regime tributário</label>
              <select className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors">
                <option>Simples Nacional</option>
                <option>Lucro Presumido</option>
                <option>Lucro Real</option>
              </select>
            </div>
            <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
              Salvar configurações
            </button>
          </div>
        </div>
      )}

      {/* Modal emitir NF-e */}
      {modalEmitir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Emitir NF-e</h2>
              <button onClick={() => setModalEmitir(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleEmitir} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Cliente *</label>
                <input value={cliente} onChange={(e) => setCliente(e.target.value)} required placeholder="Nome do cliente" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Serviço prestado *</label>
                <input value={servico} onChange={(e) => setServico(e.target.value)} required placeholder="Ex: Corte + Barba" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Valor (R$) *</label>
                <input value={valor} onChange={(e) => setValor(e.target.value)} required type="number" placeholder="95.00" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-zinc-400">
                ⚠ A integração real com a prefeitura requer certificado digital A1/A3. Esta tela prepara os dados para emissão.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalEmitir(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">Emitir NF-e</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}