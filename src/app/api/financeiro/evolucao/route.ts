import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

export async function GET(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()))

    const anoInicio = new Date(ano, 0, 1)
    const anoFim = new Date(ano, 11, 31, 23, 59, 59)

    // Duas queries SQL agregadas — retornam no máximo 12 linhas cada
    const [pgPagamentos, pgAssinaturas] = await Promise.all([
      prisma.$queryRaw<{ mes: number; total: number }[]>`
        SELECT
          EXTRACT(MONTH FROM a.scheduled_at)::int AS mes,
          COALESCE(SUM(p.amount), 0)::float8      AS total
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        WHERE p.status = 'PAID'
          AND a.establishment_id = ${ESTAB_ID}
          AND a.scheduled_at >= ${anoInicio}
          AND a.scheduled_at <= ${anoFim}
        GROUP BY mes
        ORDER BY mes
      `,

      prisma.$queryRaw<{ mes: number; total: number }[]>`
        SELECT
          EXTRACT(MONTH FROM t.created_at)::int AS mes,
          COALESCE(SUM(t.amount), 0)::float8    AS total
        FROM transactions t
        JOIN cash_registers cr ON t.cash_register_id = cr.id
        WHERE t.type = 'RECEITA'
          AND t.description LIKE 'Assinatura ·%'
          AND t.created_at >= ${anoInicio}
          AND t.created_at <= ${anoFim}
          AND cr.establishment_id = ${ESTAB_ID}
        GROUP BY mes
        ORDER BY mes
      `,
    ])

    const totalPorMes = new Array(12).fill(0)
    for (const row of pgPagamentos)  totalPorMes[Number(row.mes) - 1] += Number(row.total)
    for (const row of pgAssinaturas) totalPorMes[Number(row.mes) - 1] += Number(row.total)

    const evolucao = MESES.map((label, i) => ({
      mes: i + 1,
      label,
      valor: Math.round(totalPorMes[i] * 100) / 100,
    }))

    return NextResponse.json(evolucao, {
      headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" },
    })
  } catch (error) {
    console.error("[GET /api/financeiro/evolucao]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
