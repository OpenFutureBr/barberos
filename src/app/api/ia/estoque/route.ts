import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getIaConfig, callText } from "@/lib/ia-providers"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "ia_estoque")
    if (bloqueio) return bloqueio

    const agora = new Date()
    const ha7dias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
    const ha14dias = new Date(agora.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Produtos com movimentos de saída dos últimos 14 dias
    const produtos = await prisma.product.findMany({
      where: { establishmentId: estabId, isActive: true },
      include: {
        stockMovements: {
          where: { type: "SAIDA", createdAt: { gte: ha14dias } },
          select: { quantity: true, createdAt: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const previsoes = produtos.map(p => {
      const saidasUlt7 = p.stockMovements
        .filter(m => m.createdAt >= ha7dias)
        .reduce((s, m) => s + m.quantity, 0)

      const saidasAnt7 = p.stockMovements
        .filter(m => m.createdAt < ha7dias)
        .reduce((s, m) => s + m.quantity, 0)

      const vendaSemana = saidasUlt7
      const vendaDia = vendaSemana / 7

      // Tendência: compara última semana com semana anterior
      let tendencia: "alta" | "queda" | "estavel" = "estavel"
      if (saidasAnt7 > 0) {
        const delta = (saidasUlt7 - saidasAnt7) / saidasAnt7
        if (delta > 0.2) tendencia = "alta"
        else if (delta < -0.2) tendencia = "queda"
      } else if (saidasUlt7 > 0) {
        tendencia = "alta"
      }

      // Dias até ruptura
      const diasRuptura = vendaDia > 0 ? Math.ceil(p.stock / vendaDia) : 999

      // Urgência
      let urgencia: "CRITICA" | "ATENCAO" | "OK" = "OK"
      if (p.stock <= p.minStock) urgencia = "CRITICA"
      else if (p.stock <= p.minStock * 1.5) urgencia = "ATENCAO"
      else if (diasRuptura <= 7) urgencia = "ATENCAO"

      // Sugestão de compra: cobrir 2 semanas de venda acima do mínimo
      const sugestao = urgencia !== "OK"
        ? Math.max(0, Math.ceil(p.minStock * 3 - p.stock + vendaSemana))
        : 0

      return {
        id: p.id,
        produto: p.name,
        sku: p.sku ?? p.barcode ?? "",
        estoque: p.stock,
        minimo: p.minStock,
        vendaSemana,
        diasRuptura: Math.min(diasRuptura, 999),
        sugestao,
        tendencia,
        urgencia,
      }
    })

    // Ordenar: CRITICA primeiro, depois ATENCAO, depois OK
    previsoes.sort((a, b) => {
      const ord = { CRITICA: 0, ATENCAO: 1, OK: 2 }
      return ord[a.urgencia] - ord[b.urgencia] || a.diasRuptura - b.diasRuptura
    })

    // Gerar insight via Groq (somente se houver chave configurada)
    let insight = ""
    try {
      const cfg = await getIaConfig()
      if (cfg.groqApiKey || cfg.geminiApiKey) {
        const criticos = previsoes.filter(p => p.urgencia === "CRITICA")
        const atencao = previsoes.filter(p => p.urgencia === "ATENCAO")

        const resumo = [
          ...criticos.map(p => `${p.produto}: ${p.estoque}un em estoque, vende ${p.vendaSemana}/semana, ruptura em ~${p.diasRuptura} dias`),
          ...atencao.map(p => `${p.produto}: ${p.estoque}un em estoque, vende ${p.vendaSemana}/semana`),
        ].join("\n")

        if (resumo) {
          const prompt = `Você é um assistente de gestão de estoque para uma barbearia. Analise brevemente (2-3 frases em português, tom direto e profissional) a situação de estoque abaixo e dê uma recomendação de ação imediata:

${resumo}

Destaque qual produto é mais urgente e por quê. Seja específico com números.`

          insight = await callText(cfg, prompt)
        }
      }
    } catch {
      insight = ""
    }

    return NextResponse.json({ previsoes, insight })
  } catch (error) {
    console.error("[GET /api/ia/estoque]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
