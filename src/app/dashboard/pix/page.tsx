"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const cobrancasMock = [
  { id: "1", cliente: "Felipe Gomes", servico: "Fade Alto + Barba", valor: 95, status: "PAID", criado: "14:03", pago: "14:05" },
  { id: "2", cliente: "Pedro Silva", servico: "Corte de Cabelo", valor: 65, status: "PAID", criado: "13:20", pago: "13:22" },
  { id: "3", cliente: "João Ribeiro", servico: "Corte + Barba", valor: 95, status: "PENDING", criado: "14:30", pago: null },
  { id: "4", cliente: "Carlos Souza", servico: "Barba Completa", valor: 45, status: "EXPIRED", criado: "12:00", pago: null },
]

const statusStyle: Record<string, string> = {
  PAID: "bg-green-500/10 text-green-400 border border-green-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  EXPIRED: "bg-red-500/10 text-red-400 border border-red-500/20",
}

const statusLabel: Record<string, string> = {
  PAID: "✓ Pago",
  PENDING: "● Aguardando",
  EXPIRED: "✕ Expirado",
}

export default function PixPage() {
  const [modalGerar, setModalGerar] = useState(false)
  const [modalQR, setModalQR] = useState(false)
  const [cliente, setCliente] = useState("")
  const [servico, setServico] = useState("Corte de Cabelo")
  const [valor, setValor] = useState("")
  const [splitTipo, setSplitTipo] = useState("SPLIT_ESTABLISHMENT")
  const [pixGerado, setPixGerado] = useState(false)

  const totalHoje = cobrancasMock
    .filter(c => c.status === "PAID")
    .reduce((s, c) => s + c.valor, 0)

  function handleGerar(e: React.FormEvent) {
    e.preventDefault()
    setModalGerar(false)
    setPixGerado(true)
    setModalQR(true)
  }

  return (
    <DashboardLayout>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">PIX & Cobranças</h1>
          <p className="text-zinc-500 text-sm">Geração instantânea · Split automático · EfiBank</p>
        </div>
        <button
          onClick={() => setModalGerar(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Gerar PIX
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-green-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Recebido hoje</div>
          <div className="text-green-400 text-2xl font-bold">R$ {totalHoje.toFixed(2)}</div>
          <div className="text-zinc-600 text-xs mt-1">{cobrancasMock.filter(c => c.status === "PAID").length} pagamentos confirmados</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-amber-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Aguardando</div>
          <div className="text-amber-400 text-2xl font-bold">R$ {cobrancasMock.filter(c => c.status === "PENDING").reduce((s,c) => s+c.valor, 0).toFixed(2)}</div>
          <div className="text-zinc-600 text-xs mt-1">{cobrancasMock.filter(c => c.status === "PENDING").length} cobrança pendente</div>
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">Split automático ativo</div>
          <div className="text-white text-sm font-medium">Repasses calculados automaticamente para cada profissional após confirmação do PIX</div>
        </div>
      </div>

      {/* Lista de cobranças */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Cobranças do dia</span>
          <span className="text-zinc-600 text-xs">{cobrancasMock.length} registros</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
              <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Serviço</th>
              <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Criado</th>
              <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
              <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {cobrancasMock.map((c, i) => (
              <tr
                key={c.id}
                className={`border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors cursor-pointer ${i === cobrancasMock.length - 1 ? "border-0" : ""}`}
                onClick={() => setModalQR(true)}
              >
                <td className="px-4 py-3 text-white text-sm font-medium">{c.cliente}</td>
                <td className="px-4 py-3 text-zinc-400 text-sm">{c.servico}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{c.criado}</td>
                <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">R$ {c.valor.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[c.status]}`}>
                    {statusLabel[c.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal gerar PIX */}
      {modalGerar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Gerar Cobrança PIX</h2>
              <button onClick={() => setModalGerar(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleGerar} className="p-5 space-y-3">

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Cliente *</label>
                <input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  required
                  placeholder="Nome do cliente"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Serviço *</label>
                <select
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                >
                  <option>Corte de Cabelo — R$ 65</option>
                  <option>Corte + Barba — R$ 95</option>
                  <option>Barba Completa — R$ 45</option>
                  <option>Progressiva — R$ 180</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Valor (R$) *</label>
                <input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 95.00"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              {/* Split */}
              <div>
                <label className="text-zinc-400 text-xs mb-2 block">Tipo de split</label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setSplitTipo("SPLIT_ESTABLISHMENT")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      splitTipo === "SPLIT_ESTABLISHMENT"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  >
                    <div className={`text-xs font-medium ${splitTipo === "SPLIT_ESTABLISHMENT" ? "text-amber-400" : "text-zinc-400"}`}>
                      🏪 Split Estabelecimento
                    </div>
                    <div className="text-zinc-600 text-xs mt-0.5">Divide com o profissional</div>
                  </div>
                  <div
                    onClick={() => setSplitTipo("DIRECT_PROFESSIONAL")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      splitTipo === "DIRECT_PROFESSIONAL"
                        ? "bg-teal-500/10 border-teal-500/30"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  >
                    <div className={`text-xs font-medium ${splitTipo === "DIRECT_PROFESSIONAL" ? "text-teal-400" : "text-zinc-400"}`}>
                      🚗 Direto Profissional
                    </div>
                    <div className="text-zinc-600 text-xs mt-0.5">100% para o autônomo</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalGerar(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Gerar QR Code PIX
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {modalQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Cobrança PIX</h2>
              <button onClick={() => setModalQR(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="p-5 text-center">
              <div className="text-zinc-400 text-sm mb-1">Felipe Gomes · Fade Alto + Barba</div>
              <div className="text-green-400 text-3xl font-bold mb-4">R$ 95,00</div>

              {/* QR Code simulado */}
              <div className="w-40 h-40 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center">
                <div className="grid grid-cols-5 gap-0.5 p-2">
                  {Array.from({length: 25}).map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-sm ${
                        [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,7,12,17].includes(i)
                          ? "bg-zinc-900"
                          : "bg-white"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-zinc-800 rounded-lg p-3 mb-4 text-left">
                <div className="text-zinc-500 text-xs mb-1 font-mono">PIX Copia e Cola</div>
                <div className="text-zinc-300 text-xs font-mono break-all">
                  00020126580014BR.GOV.BCB.PIX0136...barberos/pix/1840
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors border border-zinc-700">
                  📋 Copiar PIX
                </button>
                <button className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors border border-green-500/20">
                  💬 WhatsApp
                </button>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-zinc-500 text-xs">Aguardando pagamento...</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}