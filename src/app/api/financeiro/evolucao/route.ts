import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const ESTAB_ID = "estab001"

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()))

    const anoInicio = new Date(ano, 0, 1)
    const anoFim = new Date(ano, 11, 31, 23, 59, 59)

    const [pagamentos, transacoesAssinatura] = await Promise.all([
      // Pagamentos de agendamentos
      prisma.payment.findMany({
        where: {
          status: "PAID",
          appointment: {
            establishmentId: ESTAB_ID,
            scheduledAt: { gte: anoInicio, lte: anoFim },
          },
        },
        select: {
          amount: true,
          appointment: { select: { scheduledAt: true } },
        },
      }),

      // Pagamentos de assinaturas (registrados como Transaction)
      prisma.transaction.findMany({
        where: {
          type: "RECEITA",
          description: { startsWith: "Assinatura ·" },
          createdAt: { gte: anoInicio, lte: anoFim },
          cashRegister: { establishmentId: ESTAB_ID },
        },
        select: { amount: true, createdAt: true },
      }),
    ])

    const totalPorMes = new Array(12).fill(0)

    for (const p of pagamentos) {
      const mes = new Date(p.appointment.scheduledAt).getMonth()
      totalPorMes[mes] += p.amount
    }

    for (const t of transacoesAssinatura) {
      const mes = new Date(t.createdAt).getMonth()
      totalPorMes[mes] += t.amount
    }

    const evolucao = MESES.map((label, i) => ({
      mes: i + 1,
      label,
      valor: Math.round(totalPorMes[i] * 100) / 100,
    }))

    return NextResponse.json(evolucao)
  } catch (error) {
    console.error("[GET /api/financeiro/evolucao]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
