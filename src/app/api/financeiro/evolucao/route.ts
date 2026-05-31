import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const ESTAB_ID = "estab001"

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()))

    // Agrega receita por mês diretamente no banco — evita carregar N registros em JS
    const rows = await prisma.$queryRaw<{ mes: number; valor: number }[]>`
      SELECT
        EXTRACT(MONTH FROM a."scheduledAt")::int AS mes,
        ROUND(SUM(p.amount)::numeric, 2)         AS valor
      FROM payments p
      JOIN appointments a ON a.id = p."appointmentId"
      WHERE p.status = 'PAID'
        AND a."establishmentId" = ${ESTAB_ID}
        AND EXTRACT(YEAR FROM a."scheduledAt") = ${ano}
      GROUP BY mes
      ORDER BY mes
    `

    // Preenche os 12 meses (meses sem receita ficam com 0)
    const mapa = new Map(rows.map(r => [r.mes, Number(r.valor)]))
    const evolucao = MESES.map((label, i) => ({
      mes: i + 1,
      label,
      valor: mapa.get(i + 1) ?? 0,
    }))

    return NextResponse.json(evolucao)
  } catch (error) {
    console.error("[GET /api/financeiro/evolucao]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
