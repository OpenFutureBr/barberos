import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getIaConfig, callText } from "@/lib/ia-providers"

function calcularRisco(diasSemVisita: number, avgIntervalo: number | null): number {
  if (!avgIntervalo || avgIntervalo === 0) {
    // Sem histórico de intervalo: risco baixo se visitou recentemente
    return diasSemVisita > 60 ? 80 : diasSemVisita > 30 ? 40 : 10
  }
  const ratio = diasSemVisita / avgIntervalo
  if (ratio >= 2.5) return 95
  if (ratio >= 2.0) return 85
  if (ratio >= 1.5) return 70
  if (ratio >= 1.2) return 50
  if (ratio >= 1.0) return 30
  return Math.max(0, Math.round(ratio * 30))
}

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const clientes = await prisma.client.findMany({
      where: { establishmentId: estabId, isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        segment: true,
        totalAtendimentos: true,
        lastVisitAt: true,
        avgVisitInterval: true,
        totalSpent: true,
        ticketMedio: true,
        cashbackBalance: true,
      },
      orderBy: { lastVisitAt: { sort: "asc", nulls: "first" } },
    })

    const agora = new Date()

    const clientesProcessados = clientes.map(c => {
      const diasSemVisita = c.lastVisitAt
        ? Math.floor((agora.getTime() - c.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999

      const risco = calcularRisco(diasSemVisita, c.avgVisitInterval)

      return {
        id: c.id,
        nome: c.name,
        telefone: c.phone,
        segmento: c.segment,
        visitas: c.totalAtendimentos,
        ticket: Math.round(c.ticketMedio),
        intervalo: c.avgVisitInterval ?? 0,
        diasSemVisita: diasSemVisita === 999 ? 0 : diasSemVisita,
        risco,
        cashback: Math.round(c.cashbackBalance),
        totalGasto: Math.round(c.totalSpent),
      }
    })

    // Ordenar por risco decrescente
    clientesProcessados.sort((a, b) => b.risco - a.risco)

    // Gerar insight via Groq
    let insight = ""
    try {
      const cfg = await getIaConfig()
      if (cfg.groqApiKey || cfg.geminiApiKey) {
        const top3Risco = clientesProcessados.filter(c => c.risco >= 60).slice(0, 3)
        if (top3Risco.length > 0) {
          const resumo = top3Risco.map(c =>
            `${c.nome}: ${c.visitas} visitas, ticket R$${c.ticket}, ${c.diasSemVisita} dias sem visita (intervalo habitual: ${c.intervalo || "?"}d), gasto total R$${c.totalGasto}, score risco ${c.risco}%`
          ).join("\n")

          const prompt = `Você é um consultor de CRM para barbearias. Analise os clientes em risco abaixo (2-3 frases em português, direto e acionável):

${resumo}

Aponte o cliente mais crítico, a receita potencial em risco e a ação mais urgente.`

          insight = await callText(cfg, prompt)
        }
      }
    } catch {
      insight = ""
    }

    return NextResponse.json({ clientes: clientesProcessados, insight })
  } catch (error) {
    console.error("[GET /api/ia/clientes]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
