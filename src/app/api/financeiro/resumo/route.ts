import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const ESTAB_ID = "estab001"

function arredondar(v: number) {
  return Math.round(v * 100) / 100
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const ano = parseInt(searchParams.get("ano")!)
    const mes = parseInt(searchParams.get("mes")!)

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 0, 23, 59, 59)

    const [pagamentos, assinaturas] = await Promise.all([
      // Receita de agendamentos
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
    ])

    const receitaServicos = pagamentos._sum.amount ?? 0
    const receitaAssinaturas = assinaturas._sum.amount ?? 0
    const total = receitaServicos + receitaAssinaturas

    return NextResponse.json({
      receitaServicos: arredondar(receitaServicos),
      receitaAssinaturas: arredondar(receitaAssinaturas),
      totalReceitas: arredondar(total),
      total: arredondar(total),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
