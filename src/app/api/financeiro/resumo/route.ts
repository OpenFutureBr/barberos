import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"

function arredondar(v: number) {
  return Math.round(v * 100) / 100
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "financeiro")
    if (bloqueio) return bloqueio

    const { searchParams } = new URL(request.url)

    const ano = parseInt(searchParams.get("ano")!)
    const mes = parseInt(searchParams.get("mes")!)

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 0, 23, 59, 59)

    const [pagamentos, assinaturas, movimentosProdutos] = await Promise.all([
      // Receita de agendamentos (serviço)
      prisma.payment.aggregate({
        where: {
          status: "PAID",
          appointment: {
            establishmentId: ESTAB_ID,
            scheduledAt: { gte: inicio, lte: fim },
          },
        },
        _sum: { amount: true },
      }),

      // Receita de assinaturas pagas no período (registradas como Transaction)
      prisma.transaction.aggregate({
        where: {
          type: "RECEITA",
          description: { startsWith: "Assinatura ·" },
          createdAt: { gte: inicio, lte: fim },
          cashRegister: { establishmentId: ESTAB_ID },
        },
        _sum: { amount: true },
      }),

      // Receita de produtos (materiais vendidos do estoque) — faltava por completo
      prisma.stockMovement.findMany({
        where: {
          type: "SAIDA",
          createdAt: { gte: inicio, lte: fim },
          product: { establishmentId: ESTAB_ID },
        },
        select: { quantity: true, unitPrice: true },
      }),
    ])

    const receitaServicos = pagamentos._sum.amount ?? 0
    const receitaAssinaturas = assinaturas._sum.amount ?? 0
    const receitaProdutos = movimentosProdutos.reduce(
      (s, m) => s + m.quantity * (m.unitPrice ?? 0),
      0,
    )
    const total = receitaServicos + receitaProdutos + receitaAssinaturas

    return NextResponse.json({
      receitaServicos: arredondar(receitaServicos),
      receitaProdutos: arredondar(receitaProdutos),
      receitaAssinaturas: arredondar(receitaAssinaturas),
      totalReceitas: arredondar(total),
      total: arredondar(total),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
