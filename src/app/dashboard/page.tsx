"use client"

import { useState, useEffect, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import BotaoWhatsApp from "@/components/ui/BotaoWhatsApp"

function fmtMoeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDataCurta(iso: string | null): string {
  if (!iso) return "Nunca"
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function hojeStr(): string {
  return new Date().toISOString().split("T")[0]
}

function navDia(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + delta)
  return d.toISOString().split("T")[0]
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

type Dados = {
  faturamento: number
  atendimentos: number
  ticketMedio: number
  clientesVip: number
  pendentes: number
  mesAtualClientes: number
  mesAnteriorClientes: number
}

type Inativo = {
  id: string
  name: string
  phone: string
  cancelados: number
  concluidos: number
  ultimaVisita: string | null
}

export default function DashboardPage() {
  const [modoData, setModoData] = useState<"dia" | "periodo">("dia")
  const [dataSelecionada, setDataSelecionada] = useState(hojeStr())
  const [dataInicio, setDataInicio] = useState(hojeStr())
  const [dataFim, setDataFim] = useState(hojeStr())

  const [dados, setDados] = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)

  const [diasInativos, setDiasInativos] = useState(7)
  const [diasInput, setDiasInput] = useState("7")
  const [inativos, setInativos] = useState<Inativo[]>([])
  const [loadingInativos, setLoadingInativos] = useState(false)

  const fetchDados = useCallback(() => {
    const from = modoData === "dia" ? dataSelecionada : dataInicio
    const to = modoData === "dia" ? dataSelecionada : dataFim
    setLoading(true)
    fetch(`/api/dashboard?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setDados(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [modoData, dataSelecionada, dataInicio, dataFim])

  useEffect(() => { fetchDados() }, [fetchDados])

  const fetchInativos = useCallback(() => {
    setLoadingInativos(true)
    fetch(`/api/dashboard/inativos?dias=${diasInativos}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setInativos(d) })
      .catch(console.error)
      .finally(() => setLoadingInativos(false))
  }, [diasInativos])

  useEffect(() => { fetchInativos() }, [fetchInativos])

  const agora = new Date()
  const mesAtualNome = MESES[agora.getMonth()]
  const mesAnteriorNome = MESES[(agora.getMonth() + 11) % 12]

  const varClientes =
    dados && dados.mesAnteriorClientes > 0
      ? ((dados.mesAtualClientes - dados.mesAnteriorClientes) / dados.mesAnteriorClientes) * 100
      : null

  function aplicarDias() {
    const n = Math.max(1, parseInt(diasInput) || 7)
    setDiasInativos(n)
    setDiasInput(String(n))
  }

  return (
    <DashboardLayout>

      {/* Filtro de data */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-zinc-800 rounded-lg overflow-hidden text-xs font-medium">
            <button
              onClick={() => setModoData("dia")}
              className={`px-3 py-1.5 transition-colors ${modoData === "dia" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"}`}
            >
              Dia
            </button>
            <button
              onClick={() => setModoData("periodo")}
              className={`px-3 py-1.5 transition-colors ${modoData === "periodo" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"}`}
            >
              Período
            </button>
          </div>

          {modoData === "dia" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDataSelecionada(navDia(dataSelecionada, -1))}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ‹
              </button>
              <input
                type="date"
                value={dataSelecionada}
                onChange={e => setDataSelecionada(e.target.value)}
                className="bg-transparent text-white text-sm outline-none cursor-pointer [color-scheme:dark]"
              />
              <button
                onClick={() => setDataSelecionada(navDia(dataSelecionada, 1))}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ›
              </button>
              {dataSelecionada !== hojeStr() && (
                <button onClick={() => setDataSelecionada(hojeStr())} className="text-xs text-amber-500 hover:text-amber-400 transition-colors">
                  Hoje
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-500 text-xs">De</span>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white text-sm px-2 py-1 rounded-lg outline-none focus:border-amber-500 [color-scheme:dark]"
              />
              <span className="text-zinc-500 text-xs">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white text-sm px-2 py-1 rounded-lg outline-none focus:border-amber-500 [color-scheme:dark]"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Faturamento</div>
          {loading
            ? <div className="h-8 bg-zinc-800 rounded animate-pulse" />
            : <div className="text-amber-400 text-2xl font-bold">{fmtMoeda(dados?.faturamento ?? 0)}</div>
          }
          <div className="text-zinc-600 text-xs mt-1">serviços + produtos</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500" />
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Atendimentos</div>
          {loading
            ? <div className="h-8 bg-zinc-800 rounded animate-pulse" />
            : <div className="text-green-400 text-2xl font-bold">{dados?.atendimentos ?? 0}</div>
          }
          <div className="text-zinc-600 text-xs mt-1">
            {!loading && dados && dados.pendentes > 0
              ? <span className="text-yellow-500">{dados.pendentes} pendentes</span>
              : "concluídos no período"
            }
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Ticket médio</div>
          {loading
            ? <div className="h-8 bg-zinc-800 rounded animate-pulse" />
            : <div className="text-blue-400 text-2xl font-bold">{fmtMoeda(dados?.ticketMedio ?? 0)}</div>
          }
          <div className="text-zinc-600 text-xs mt-1">por atendimento</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500" />
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Clientes VIP</div>
          {loading
            ? <div className="h-8 bg-zinc-800 rounded animate-pulse" />
            : <div className="text-purple-400 text-2xl font-bold">{dados?.clientesVip ?? 0}</div>
          }
          <div className="text-zinc-600 text-xs mt-1">total na base</div>
        </div>

      </div>

      {/* Clientes por mês */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Clientes distintos no mês</div>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-zinc-500 text-xs mb-1">{mesAtualNome}</div>
            <div className="text-white text-3xl font-bold">
              {loading ? <span className="text-zinc-600">—</span> : dados?.mesAtualClientes ?? 0}
            </div>
          </div>
          <div className="text-zinc-700 text-2xl font-light mb-1">vs</div>
          <div>
            <div className="text-zinc-500 text-xs mb-1">{mesAnteriorNome}</div>
            <div className="text-zinc-400 text-3xl font-bold">
              {loading ? <span className="text-zinc-600">—</span> : dados?.mesAnteriorClientes ?? 0}
            </div>
          </div>
          {!loading && varClientes !== null && (
            <div className={`text-sm font-semibold mb-1 ${varClientes >= 0 ? "text-green-400" : "text-red-400"}`}>
              {varClientes >= 0 ? "↑" : "↓"} {Math.abs(varClientes).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-zinc-600 text-xs mt-2">Clientes únicos com atendimento concluído — não afetado pelo filtro de data acima</p>
      </div>

      {/* Clientes inativos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Clientes sem retorno</div>
            <div className="text-zinc-600 text-xs mt-0.5">Sem atendimento concluído no período</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs">Últimos</span>
            <input
              type="number"
              min="1"
              max="365"
              value={diasInput}
              onChange={e => setDiasInput(e.target.value)}
              onBlur={aplicarDias}
              onKeyDown={e => e.key === "Enter" && aplicarDias()}
              className="w-16 bg-zinc-800 border border-zinc-700 text-white text-sm text-center px-2 py-1 rounded-lg outline-none focus:border-amber-500"
            />
            <span className="text-zinc-500 text-xs">dias</span>
          </div>
        </div>

        {loadingInativos ? (
          <div className="text-center py-8 text-zinc-600 text-sm">Carregando...</div>
        ) : inativos.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-sm">Nenhum cliente inativo nos últimos {diasInativos} dias</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-zinc-800">
                    <th className="text-zinc-500 text-xs font-normal pb-2 pr-4">Cliente</th>
                    <th className="text-zinc-500 text-xs font-normal pb-2 pr-4">Telefone</th>
                    <th className="text-zinc-500 text-xs font-normal pb-2 pr-4 text-center">Cancelados no período</th>
                    <th className="text-zinc-500 text-xs font-normal pb-2 pr-4 text-center">Total concluídos</th>
                    <th className="text-zinc-500 text-xs font-normal pb-2 pr-4">Última visita</th>
                    <th className="text-zinc-500 text-xs font-normal pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {inativos.map(c => (
                    <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 pr-4 text-white font-medium">{c.name}</td>
                      <td className="py-2.5 pr-4 text-zinc-400 font-mono text-xs">{c.phone}</td>
                      <td className="py-2.5 pr-4 text-center">
                        {c.cancelados > 0
                          ? <span className="text-red-400 font-medium">{c.cancelados}</span>
                          : <span className="text-zinc-600">—</span>
                        }
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <span className={c.concluidos > 0 ? "text-green-400" : "text-zinc-600"}>
                          {c.concluidos || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-zinc-500 text-xs">{fmtDataCurta(c.ultimaVisita)}</td>
                      <td className="py-2.5">
                        <BotaoWhatsApp telefone={c.phone} nome={c.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-zinc-600 text-xs mt-3">
              {inativos.length} cliente{inativos.length !== 1 ? "s" : ""} sem retorno nos últimos {diasInativos} dias
            </div>
          </>
        )}
      </div>

    </DashboardLayout>
  )
}
