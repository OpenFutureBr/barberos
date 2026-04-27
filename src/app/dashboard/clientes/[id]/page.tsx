"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const clienteMock = {
  id: "1",
  nome: "Felipe Gomes",
  telefone: "(11) 99874-3312",
  email: "felipe@email.com",
  nascimento: "15/03/1994",
  idade: 32,
  cidade: "Pinheiros · São Paulo",
  faceShape: "oval",
  aiConfianca: 94,
  segmento: "VIP",
  cashback: 47,
  totalGasto: 1890,
  visitas: 18,
  ticketMedio: 95,
  intervaloMedio: 21,
  diasSemVisita: 5,
  ultimaVisita: "22/03/2026",
  proximaVisitaPrevista: "12/04/2026",
  barbeiroPref: "Lucas Carvalho",
  produtoPref: "Pomada Matte American Crew",
  alergias: "Amônia",
  obs: "Barba curta · degradê alto",
  assinatura: "Plano Full · R$ 190/mês",
}

const historicoMock = [
  { data: "22/03/2026", servico: "Fade Alto + Barba", barbeiro: "Lucas", valor: 95, duracao: 55 },
  { data: "01/03/2026", servico: "Fade Alto", barbeiro: "Lucas", valor: 65, duracao: 40 },
  { data: "08/02/2026", servico: "Fade + Barba + Hidratação", barbeiro: "Lucas", valor: 130, duracao: 75 },
  { data: "18/01/2026", servico: "Fade Alto + Barba", barbeiro: "Lucas", valor: 95, duracao: 55 },
  { data: "28/12/2025", servico: "Fade Alto", barbeiro: "Lucas", valor: 65, duracao: 40 },
  { data: "07/12/2025", servico: "Fade + Barba", barbeiro: "Lucas", valor: 95, duracao: 55 },
]

const cortesIA = [
  { nome: "Fade Alto", pct: 97 },
  { nome: "Degradê Médio", pct: 91 },
  { nome: "Undercut", pct: 88 },
  { nome: "Pompadour", pct: 81 },
]

export default function ClientePerfilPage() {
  const [aba, setAba] = useState<"perfil" | "historico" | "ia" | "financeiro">("perfil")

  return (
    <DashboardLayout>

      <div className="flex items-start gap-5 mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-zinc-700 border-2 border-zinc-600 flex items-center justify-center text-3xl">
            👨‍🦱
          </div>
          <div className="absolute -bottom-2 -right-2 bg-purple-500 rounded-lg px-2 py-0.5 text-xs font-bold text-white font-mono">
            IA
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-white text-2xl font-bold">{clienteMock.nome}</h1>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">★ VIP</span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">{clienteMock.visitas} visitas</span>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Cashback R$ {clienteMock.cashback}</span>
          </div>
          <div className="flex gap-4 text-zinc-400 text-sm mb-3">
            <span>📱 {clienteMock.telefone}</span>
            <span>✉️ {clienteMock.email}</span>
            <span>🎂 {clienteMock.idade} anos</span>
            <span>📍 {clienteMock.cidade}</span>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/agenda" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">
              + Agendar
            </a>
            <a href="https://wa.me/5511998743312" target="_blank" className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-1.5 rounded-lg text-sm border border-green-500/20 transition-colors">
              💬 WhatsApp
            </a>
            <button
              onClick={() => alert("Edição em desenvolvimento — Fase 4")}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-1.5 rounded-lg text-sm border border-zinc-700 transition-colors"
            >
              ✏️ Editar
            </button>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-zinc-500 text-xs mb-1">Total gasto</div>
          <div className="text-amber-400 text-2xl font-bold">R$ {clienteMock.totalGasto}</div>
          <div className="text-zinc-600 text-xs mt-1">Ticket médio: R$ {clienteMock.ticketMedio}</div>
          <div className="text-zinc-600 text-xs">{clienteMock.assinatura}</div>
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {[
          { id: "perfil", label: "👤 Perfil" },
          { id: "historico", label: "📋 Histórico" },
          { id: "ia", label: "🤖 IA Biotipo" },
          { id: "financeiro", label: "💰 Financeiro" },
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

      {aba === "perfil" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Preferências</div>
              <div className="space-y-0">
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Barbeiro preferido</span>
                  <span className="text-white text-sm font-medium">{clienteMock.barbeiroPref}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Produto preferido</span>
                  <span className="text-white text-sm font-medium">{clienteMock.produtoPref}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Observações</span>
                  <span className="text-white text-sm font-medium">{clienteMock.obs}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-red-400 text-sm">⚠ Alergias</span>
                  <span className="text-red-400 text-sm font-medium">{clienteMock.alergias}</span>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Assinatura</div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                <div className="text-green-400 text-sm font-medium">{clienteMock.assinatura}</div>
                <div className="text-zinc-500 text-xs mt-1">Renovação automática via PIX</div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Frequência</div>
              <div className="space-y-0">
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Última visita</span>
                  <span className="text-white text-sm">{clienteMock.ultimaVisita}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Intervalo médio</span>
                  <span className="text-white text-sm">{clienteMock.intervaloMedio} dias</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Próxima visita prevista</span>
                  <span className="text-amber-400 text-sm font-medium">{clienteMock.proximaVisitaPrevista}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-zinc-500 text-sm">Dias sem visita</span>
                  <span className="text-green-400 text-sm font-medium">{clienteMock.diasSemVisita} dias</span>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Score IA</div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">Risco de churn</span>
                    <span className="text-green-400">5%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "5%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">Fidelidade</span>
                    <span className="text-amber-400">98%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "98%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">Valor para o negócio</span>
                    <span className="text-purple-400">95%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "95%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {aba === "historico" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between">
            <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Histórico de visitas</span>
            <span className="text-zinc-600 text-xs">Intervalo médio: {clienteMock.intervaloMedio} dias</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Data</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Serviço</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Barbeiro</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Duração</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
              </tr>
            </thead>
            <tbody>
              {historicoMock.map((h, i) => (
                <tr key={i} className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${i === historicoMock.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 text-zinc-400 text-sm font-mono">{h.data}</td>
                  <td className="px-4 py-3 text-white text-sm font-medium">{h.servico}</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{h.barbeiro}</td>
                  <td className="px-4 py-3 text-zinc-500 text-sm">{h.duracao} min</td>
                  <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">R$ {h.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aba === "ia" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-4">Análise de biotipo</div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">🥚</div>
              <div>
                <div className="text-white text-xl font-bold">Rosto Oval</div>
                <div className="text-purple-400 text-sm">{clienteMock.aiConfianca}% de confiança · GPT-4o Vision</div>
                <div className="text-zinc-500 text-xs mt-1">Analisado em 22/03/2026</div>
              </div>
            </div>
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
              <div className="text-zinc-400 text-sm">Rosto equilibrado, testa ligeiramente mais larga que o queixo. Compatível com a maioria dos cortes modernos.</div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-4">Cortes recomendados</div>
            <div className="space-y-3">
              {cortesIA.map((corte, i) => (
                <div key={i} className={`p-3 rounded-lg ${i === 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-zinc-800"}`}>
                  <div className="flex justify-between mb-1">
                    <span className={`text-sm font-medium ${i === 0 ? "text-amber-400" : "text-white"}`}>
                      {i === 0 && "⭐ "}{corte.nome}
                    </span>
                    <span className={`text-xs font-mono font-bold ${i === 0 ? "text-amber-400" : "text-zinc-400"}`}>{corte.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${i === 0 ? "bg-amber-500" : "bg-zinc-500"}`} style={{ width: `${corte.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {aba === "financeiro" && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 border-t-2 border-t-amber-500">
              <div className="text-zinc-500 text-xs mb-1">Total gasto</div>
              <div className="text-amber-400 text-2xl font-bold">R$ {clienteMock.totalGasto}</div>
              <div className="text-zinc-600 text-xs mt-1">{clienteMock.visitas} visitas</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 border-t-2 border-t-green-500">
              <div className="text-zinc-500 text-xs mb-1">Cashback acumulado</div>
              <div className="text-green-400 text-2xl font-bold">R$ {clienteMock.cashback}</div>
              <div className="text-zinc-600 text-xs mt-1">disponível para resgate</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 border-t-2 border-t-blue-500">
              <div className="text-zinc-500 text-xs mb-1">Ticket médio</div>
              <div className="text-blue-400 text-2xl font-bold">R$ {clienteMock.ticketMedio}</div>
              <div className="text-zinc-600 text-xs mt-1">por visita</div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Últimos pagamentos</div>
            {historicoMock.slice(0, 4).map((h, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
                <div>
                  <div className="text-white text-sm">{h.servico}</div>
                  <div className="text-zinc-500 text-xs">{h.data}</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-bold font-mono">R$ {h.valor}</div>
                  <div className="text-green-400 text-xs">+R$ {(h.valor * 0.07).toFixed(2)} cashback</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}