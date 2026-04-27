"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const dreData = [
  { categoria: "RECEITA", descricao: "Serviços presenciais", valor: 24800, tipo: "entrada" },
  { categoria: "RECEITA", descricao: "Produtos vendidos (PDV)", valor: 3650, tipo: "entrada" },
  { categoria: "RECEITA", descricao: "Assinaturas (18 clientes)", valor: 1860, tipo: "entrada" },
  { categoria: "RECEITA", descricao: "Taxa de bancada MEI", valor: 1940, tipo: "entrada" },
  { categoria: "DESPESA", descricao: "Aluguel do espaço", valor: 4500, tipo: "saida" },
  { categoria: "DESPESA", descricao: "Repasses PIX automáticos", valor: 3040, tipo: "saida" },
  { categoria: "DESPESA", descricao: "Estoque e insumos", valor: 1500, tipo: "saida" },
  { categoria: "DESPESA", descricao: "Plataforma BarberOS Pro", valor: 149, tipo: "saida" },
  { categoria: "DESPESA", descricao: "Energia e água", valor: 380, tipo: "saida" },
]

const repasses = [
  { profissional: "Lucas Carvalho", tipo: "CLT 40%", atendimentos: 52, bruto: 4940, repasse: 1976 },
  { profissional: "Ana Santos", tipo: "MEI 55%", atendimentos: 38, bruto: 3610, repasse: 1985 },
  { profissional: "Miguel Ferreira", tipo: "PJ 50%", atendimentos: 29, bruto: 2755, repasse: 1377 },
  { profissional: "Rafael Fonseca", tipo: "CLT 40%", atendimentos: 31, bruto: 2945, repasse: 1178 },
]

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const faturamentoMeses = [18200, 21500, 24100, 28450, 0, 0, 0, 0, 0, 0, 0, 0]

export default function FinanceiroPage() {
  const [aba, setAba] = useState<"dre" | "repasses" | "evolucao">("dre")
  const [periodo, setPeriodo] = useState("Abril 2026")

  const totalReceitas = dreData.filter(d => d.tipo === "entrada").reduce((s, d) => s + d.valor, 0)
  const totalDespesas = dreData.filter(d => d.tipo === "saida").reduce((s, d) => s + d.valor, 0)
  const lucroLiquido = totalReceitas - totalDespesas
  const margem = Math.round((lucroLiquido / totalReceitas) * 100)

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Financeiro</h1>
          <p className="text-zinc-500 text-sm">DRE · Repasses · Evolução mensal</p>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none"
        >
          {["Janeiro 2026", "Fevereiro 2026", "Março 2026", "Abril 2026"].map(p => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">Receita total</div>
          <div className="text-green-400 text-2xl font-bold">R$ {totalReceitas.toLocaleString("pt-BR")}</div>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="text-red-400 text-xs font-mono uppercase tracking-widest mb-1">Despesas</div>
          <div className="text-red-400 text-2xl font-bold">R$ {totalDespesas.toLocaleString("pt-BR")}</div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-1">Lucro líquido</div>
          <div className="text-amber-400 text-2xl font-bold">R$ {lucroLiquido.toLocaleString("pt-BR")}</div>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-1">Margem</div>
          <div className="text-blue-400 text-2xl font-bold">{margem}%</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "dre", label: "📊 DRE" },
          { id: "repasses", label: "💸 Repasses" },
          { id: "evolucao", label: "📈 Evolução" },
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

      {/* Aba DRE */}
      {aba === "dre" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">DRE — {periodo}</span>
          </div>
          <div className="divide-y divide-zinc-800">
            {/* Receitas */}
            <div className="px-4 py-2 bg-green-500/5">
              <span className="text-green-400 text-xs font-mono uppercase tracking-widest">Receitas</span>
            </div>
            {dreData.filter(d => d.tipo === "entrada").map((d, i) => (
              <div key={i} className="flex justify-between px-4 py-3 hover:bg-zinc-800/40">
                <span className="text-zinc-300 text-sm">{d.descricao}</span>
                <span className="text-green-400 font-mono font-bold">+ R$ {d.valor.toLocaleString("pt-BR")}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-green-500/5">
              <span className="text-green-400 text-sm font-bold">Total Receitas</span>
              <span className="text-green-400 font-mono font-bold">R$ {totalReceitas.toLocaleString("pt-BR")}</span>
            </div>

            {/* Despesas */}
            <div className="px-4 py-2 bg-red-500/5">
              <span className="text-red-400 text-xs font-mono uppercase tracking-widest">Despesas</span>
            </div>
            {dreData.filter(d => d.tipo === "saida").map((d, i) => (
              <div key={i} className="flex justify-between px-4 py-3 hover:bg-zinc-800/40">
                <span className="text-zinc-300 text-sm">{d.descricao}</span>
                <span className="text-red-400 font-mono font-bold">− R$ {d.valor.toLocaleString("pt-BR")}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-red-500/5">
              <span className="text-red-400 text-sm font-bold">Total Despesas</span>
              <span className="text-red-400 font-mono font-bold">R$ {totalDespesas.toLocaleString("pt-BR")}</span>
            </div>

            {/* Lucro */}
            <div className="flex justify-between px-4 py-4 bg-amber-500/5 border-t-2 border-amber-500/30">
              <span className="text-amber-400 text-base font-bold">Lucro Líquido</span>
              <span className="text-amber-400 font-mono font-bold text-xl">R$ {lucroLiquido.toLocaleString("pt-BR")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Aba Repasses */}
      {aba === "repasses" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Repasses PIX — {periodo}</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Profissional</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Tipo</th>
                <th className="text-center px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Atendimentos</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Bruto</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Repasse PIX</th>
              </tr>
            </thead>
            <tbody>
              {repasses.map((r, i) => (
                <tr key={i} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === repasses.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 text-white text-sm font-medium">{r.profissional}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {r.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-400 text-sm">{r.atendimentos}</td>
                  <td className="px-4 py-3 text-right text-zinc-400 font-mono">R$ {r.bruto.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-bold font-mono">R$ {r.repasse.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-zinc-800 flex justify-between bg-zinc-800/40">
            <span className="text-zinc-400 text-sm font-bold">Total repasses</span>
            <span className="text-green-400 font-bold font-mono">
              R$ {repasses.reduce((s, r) => s + r.repasse, 0).toLocaleString("pt-BR")}
            </span>
          </div>
        </div>
      )}

      {/* Aba Evolução */}
      {aba === "evolucao" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-4">Faturamento mensal — 2026</div>
          <div className="flex items-end gap-2 h-48">
            {meses.map((mes, i) => {
              const valor = faturamentoMeses[i]
              const maxVal = Math.max(...faturamentoMeses.filter(v => v > 0))
              const altura = valor > 0 ? Math.round((valor / maxVal) * 100) : 0
              return (
                <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-zinc-600 text-xs font-mono">
                    {valor > 0 ? `${(valor/1000).toFixed(0)}k` : ""}
                  </div>
                  <div className="w-full flex items-end" style={{ height: "160px" }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        valor > 0 ? "bg-amber-500/70 hover:bg-amber-500" : "bg-zinc-800"
                      }`}
                      style={{ height: valor > 0 ? `${altura}%` : "4px" }}
                    ></div>
                  </div>
                  <div className="text-zinc-600 text-xs">{mes}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-zinc-500 text-xs mb-1">Melhor mês</div>
              <div className="text-amber-400 font-bold">Abril · R$ 28.450</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-zinc-500 text-xs mb-1">Crescimento</div>
              <div className="text-green-400 font-bold">+56% (Jan→Abr)</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <div className="text-zinc-500 text-xs mb-1">Média mensal</div>
              <div className="text-blue-400 font-bold">R$ 23.062</div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}