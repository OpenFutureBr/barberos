"use client"

import { useState, useEffect, useCallback } from "react"

type UnidadeRel = {
  id: string
  nome: string
  cidade: string | null
  estado: string | null
  ativa: boolean
  equipe: number
  clientes: number
  atendimentos: number
  faturamento: number
  ticketMedio: number
  topServico: string | null
}

type Relatorio = {
  geradoEm: string
  periodo: { from: string; to: string }
  unidades: UnidadeRel[]
  totais: { atendimentos: number; faturamento: number; equipe: number; clientes: number }
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function hojeStr() {
  return new Date().toISOString().split("T")[0]
}

function inicioMesStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

export default function RelatorioExecutivoPage() {
  const [from, setFrom] = useState(inicioMesStr())
  const [to, setTo] = useState(hojeStr())
  const [dados, setDados] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)

  const buscar = useCallback(() => {
    setLoading(true)
    fetch(`/api/unidades/relatorio-executivo?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setDados(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => { buscar() }, [buscar])

  const melhorUnidade = dados?.unidades.length
    ? [...dados.unidades].sort((a, b) => b.faturamento - a.faturamento)[0]
    : null

  return (
    <div className="min-h-screen bg-white text-zinc-900 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Barra de controle — some na impressão/PDF */}
      <div className="no-print sticky top-0 z-10 bg-zinc-900 text-white px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">Relatório Executivo</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 rounded-lg outline-none [color-scheme:dark]" />
          <span className="text-zinc-500 text-xs">até</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 rounded-lg outline-none [color-scheme:dark]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
            ⬇ Baixar (PDF)
          </button>
          <button onClick={() => window.close()}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg border border-zinc-700 transition-colors">
            Fechar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Cabeçalho do relatório */}
        <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Relatório Executivo</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Período: {new Date(from + "T12:00:00").toLocaleDateString("pt-BR")} até {new Date(to + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <div>BarberOS</div>
            <div>Gerado em {new Date().toLocaleString("pt-BR")}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-zinc-400">Carregando...</div>
        ) : !dados || dados.unidades.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">Sem dados para o período selecionado.</div>
        ) : (
          <>
            {/* Resumo consolidado */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="border border-zinc-300 rounded-lg p-4">
                <div className="text-zinc-500 text-xs uppercase tracking-wider">Faturamento total</div>
                <div className="text-xl font-bold mt-1">{fmtMoeda(dados.totais.faturamento)}</div>
              </div>
              <div className="border border-zinc-300 rounded-lg p-4">
                <div className="text-zinc-500 text-xs uppercase tracking-wider">Atendimentos</div>
                <div className="text-xl font-bold mt-1">{dados.totais.atendimentos}</div>
              </div>
              <div className="border border-zinc-300 rounded-lg p-4">
                <div className="text-zinc-500 text-xs uppercase tracking-wider">Equipe ativa</div>
                <div className="text-xl font-bold mt-1">{dados.totais.equipe}</div>
              </div>
              <div className="border border-zinc-300 rounded-lg p-4">
                <div className="text-zinc-500 text-xs uppercase tracking-wider">Clientes ativos</div>
                <div className="text-xl font-bold mt-1">{dados.totais.clientes}</div>
              </div>
            </div>

            {melhorUnidade && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-6 text-sm">
                <span className="font-semibold">Melhor desempenho:</span> {melhorUnidade.nome} — {fmtMoeda(melhorUnidade.faturamento)} no período
              </div>
            )}

            {/* Tabela por unidade */}
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-900 text-left">
                  <th className="py-2 pr-3">Unidade</th>
                  <th className="py-2 pr-3">Cidade</th>
                  <th className="py-2 pr-3 text-right">Atend.</th>
                  <th className="py-2 pr-3 text-right">Faturamento</th>
                  <th className="py-2 pr-3 text-right">Ticket médio</th>
                  <th className="py-2 pr-3 text-right">Equipe</th>
                  <th className="py-2 pr-3 text-right">Clientes</th>
                  <th className="py-2 pl-3">Top serviço</th>
                </tr>
              </thead>
              <tbody>
                {dados.unidades.map(u => (
                  <tr key={u.id} className="border-b border-zinc-200">
                    <td className="py-2 pr-3 font-medium">{u.nome}{!u.ativa && <span className="text-zinc-400 text-xs ml-1">(inativa)</span>}</td>
                    <td className="py-2 pr-3 text-zinc-600">{[u.cidade, u.estado].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="py-2 pr-3 text-right">{u.atendimentos}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmtMoeda(u.faturamento)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmtMoeda(u.ticketMedio)}</td>
                    <td className="py-2 pr-3 text-right">{u.equipe}</td>
                    <td className="py-2 pr-3 text-right">{u.clientes}</td>
                    <td className="py-2 pl-3 text-zinc-600">{u.topServico ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-900 font-bold">
                  <td className="py-2 pr-3" colSpan={2}>Total</td>
                  <td className="py-2 pr-3 text-right">{dados.totais.atendimentos}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmtMoeda(dados.totais.faturamento)}</td>
                  <td className="py-2 pr-3 text-right">—</td>
                  <td className="py-2 pr-3 text-right">{dados.totais.equipe}</td>
                  <td className="py-2 pr-3 text-right">{dados.totais.clientes}</td>
                  <td className="py-2 pl-3">—</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
