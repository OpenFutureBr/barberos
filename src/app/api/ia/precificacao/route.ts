import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getIaConfig, callText } from "@/lib/ia-providers"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function POST() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "precificacao")
    if (bloqueio) return bloqueio

    const cfg = await getIaConfig()
    if (!cfg.groqApiKey && !cfg.geminiApiKey) {
      return NextResponse.json({ error: "IA não configurada" }, { status: 503 })
    }

    const ha90dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const [servicos, pagamentos] = await Promise.all([
      prisma.service.findMany({
        where: { establishmentId: estabId, isActive: true },
        select: { id: true, name: true, price: true, durationMin: true, category: true },
        orderBy: { name: "asc" },
      }),
      prisma.payment.findMany({
        where: {
          status: "PAID",
          appointment: {
            establishmentId: estabId,
            scheduledAt: { gte: ha90dias },
            status: { in: ["DONE"] },
          },
        },
        select: {
          amount: true,
          appointment: { select: { serviceId: true, scheduledAt: true } },
        },
      }),
    ])

    // Agrupa pagamentos por serviço
    type Stats = { total: number; receita: number; precos: number[] }
    const statsMap: Record<string, Stats> = {}
    for (const p of pagamentos) {
      const sid = p.appointment?.serviceId
      if (!sid) continue
      if (!statsMap[sid]) statsMap[sid] = { total: 0, receita: 0, precos: [] }
      statsMap[sid].total++
      statsMap[sid].receita += p.amount
      statsMap[sid].precos.push(p.amount)
    }

    const linhas = servicos.map(s => {
      const st = statsMap[s.id]
      if (!st || st.total === 0) return `- ${s.name}: R$${s.price.toFixed(2)} (sem vendas nos últimos 90 dias)`
      const ticketMedio = (st.receita / st.total).toFixed(2)
      return `- ${s.name}: preço atual R$${s.price.toFixed(2)}, ticket médio real R$${ticketMedio}, ${st.total} atendimentos, receita total R$${st.receita.toFixed(2)} nos últimos 90 dias`
    }).join("\n")

    const prompt = `Você é um consultor de precificação para barbearias brasileiras.

Analise os dados de movimentação dos últimos 90 dias desta barbearia e sugira ajustes de preço para cada serviço.

DADOS REAIS DE VENDAS:
${linhas}

Para cada serviço, considere:
- Demanda (volume de atendimentos)
- Ticket médio real praticado vs. preço tabela
- Rentabilidade por hora (duração do serviço)
- Oportunidade de ajuste sem impacto na demanda

Responda em formato compacto: uma linha por serviço.
Exemplo:
"Corte Social: manter R$35 — alta demanda, preço competitivo"
"Barba: subir para R$25 (+25%) — baixa procura indica espaço para valorização"

Seja direto e prático. Não mencione médias nacionais.`

    const resposta = await callText(cfg, prompt)
    return NextResponse.json({ sugestoes: resposta })
  } catch (e) {
    console.error("[POST /api/ia/precificacao]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
