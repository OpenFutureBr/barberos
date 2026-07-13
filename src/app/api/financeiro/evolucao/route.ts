import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { temPermissao } from "@/lib/permissoes"

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

export async function GET(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    // Usado tanto pelo Dashboard (gráfico de faturamento) quanto por Financeiro.
    if (!temPermissao(session?.user, "dashboard") && !temPermissao(session?.user, "financeiro")) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()))

    const anoInicio = new Date(ano, 0, 1)
    const anoFim = new Date(ano, 11, 31, 23, 59, 59)

    // Antes usava $queryRaw com nomes de coluna em snake_case (appointment_id,
    // scheduled_at, etc.) — mas o schema não tem @map nesses campos, então as
    // colunas reais são camelCase. A query dava erro de "coluna não existe" em
    // toda chamada (silenciosamente engolido pelo catch), por isso a tela de
    // Evolução nunca mostrava nada. Reescrito com o client do Prisma (ORM),
    // igual ao padrão já usado no resto do módulo financeiro, evitando SQL
    // manual sujeito a esse tipo de erro de nome de coluna.
    const [pagamentos, assinaturas, movimentosProdutos] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: "PAID",
          appointment: { establishmentId: ESTAB_ID, scheduledAt: { gte: anoInicio, lte: anoFim } },
        },
        select: { amount: true, appointment: { select: { scheduledAt: true } } },
      }),

      prisma.transaction.findMany({
        where: {
          type: "RECEITA",
          description: { startsWith: "Assinatura ·" },
          createdAt: { gte: anoInicio, lte: anoFim },
          cashRegister: { establishmentId: ESTAB_ID },
        },
        select: { amount: true, createdAt: true },
      }),

      // Receita de produtos — não entrava na evolução antes, incluída agora
      // para bater com a mesma composição (serviço + produto + assinatura) do DRE.
      prisma.stockMovement.findMany({
        where: {
          type: "SAIDA",
          createdAt: { gte: anoInicio, lte: anoFim },
          product: { establishmentId: ESTAB_ID },
        },
        select: { quantity: true, unitPrice: true, createdAt: true },
      }),
    ])

    const totalPorMes = new Array(12).fill(0)
    for (const p of pagamentos) totalPorMes[new Date(p.appointment.scheduledAt).getMonth()] += p.amount
    for (const t of assinaturas) totalPorMes[new Date(t.createdAt).getMonth()] += t.amount
    for (const m of movimentosProdutos) totalPorMes[new Date(m.createdAt).getMonth()] += m.quantity * (m.unitPrice ?? 0)

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
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
