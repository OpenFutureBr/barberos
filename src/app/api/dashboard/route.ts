import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ClientSegment, AppointmentStatus, SubscriptionStatus } from "@prisma/client"

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

function parsePeriodo(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam   = searchParams.get("to")
  const hoje      = new Date()
  const fromDate  = fromParam
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
  const toDate    = toParam
    ? new Date(`${toParam}T23:59:59`)
    : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)
  return { fromDate, toDate }
}

export async function GET(request: Request) {
  try {
    const session  = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { fromDate, toDate } = parsePeriodo(request)
    const now = new Date()

    const hojeInicio       = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const hojeFim          = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const mesAtualStart    = new Date(now.getFullYear(), now.getMonth(), 1)
    const mesAtualEnd      = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const mesAnteriorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const mesAnteriorEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Só busca agenda de hoje quando o período selecionado inclui hoje
    const periodoIncluiHoje = toDate >= hojeInicio

    const [
      clientesVip,
      agendamentosHojeResult,
      apptsMesAtual,
      apptsMesAnterior,
      pagamentosPendentes,
      assinaturasVencidas,
      receitaAssinaturasPeriodo,
      // ── SQL agregados ─────────────────────────────────────────────────────
      pgStatus,
      pgRevenue,
      pgTopServicos,
      pgTopProfissionais,
      pgPorMetodo,
      pgProdutos,
    ] = await Promise.all([

      // ── queries já eficientes (inalteradas) ───────────────────────────────

      prisma.client.count({
        where: { establishmentId: ESTAB_ID, segment: ClientSegment.VIP },
      }),

      periodoIncluiHoje
        ? prisma.appointment.findMany({
            where: { establishmentId: ESTAB_ID, scheduledAt: { gte: hojeInicio, lte: hojeFim } },
            select: {
              id: true, status: true, scheduledAt: true,
              client:       { select: { id: true, name: true, phone: true } },
              professional: { select: { id: true, name: true } },
              service:      { select: { id: true, name: true, price: true, durationMin: true } },
              payment:      { select: { amount: true } },
            },
            orderBy: { scheduledAt: "asc" },
          })
        : Promise.resolve([]),

      prisma.appointment.groupBy({
        by: ["clientId"],
        where: { establishmentId: ESTAB_ID, status: AppointmentStatus.DONE, scheduledAt: { gte: mesAtualStart, lte: mesAtualEnd } },
      }),

      prisma.appointment.groupBy({
        by: ["clientId"],
        where: { establishmentId: ESTAB_ID, status: AppointmentStatus.DONE, scheduledAt: { gte: mesAnteriorStart, lte: mesAnteriorEnd } },
      }),

      prisma.payment.aggregate({
        where: { status: "PENDING", appointment: { establishmentId: ESTAB_ID } },
        _count: { id: true },
        _sum:   { amount: true },
      }),

      prisma.subscription.aggregate({
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE] }, nextBillingAt: { lte: now }, client: { establishmentId: ESTAB_ID } },
        _count: { id: true },
        _sum:   { price: true },
      }),

      prisma.transaction.aggregate({
        where: { type: "RECEITA", description: { startsWith: "Assinatura ·" }, createdAt: { gte: fromDate, lte: toDate }, cashRegister: { establishmentId: ESTAB_ID } },
        _sum: { amount: true },
      }),

      // ── SQL agregados: substituem dois findMany que traziam linhas brutas ──

      // Contagem por status → porStatus, pendentes, cancelados
      prisma.$queryRaw<{ status: string; count: number }[]>`
        SELECT status::text, COUNT(*)::int AS count
        FROM appointments
        WHERE establishment_id = ${ESTAB_ID}
          AND scheduled_at >= ${fromDate}
          AND scheduled_at <= ${toDate}
        GROUP BY status
      `,

      // Receita e atendimentos por tipo de serviço → split, receitaServicos, faturamentoRecebido
      prisma.$queryRaw<{ service_type: string; atendimentos: number; receita: number; receita_paga: number }[]>`
        SELECT
          a.service_type,
          COUNT(*)::int                                                         AS atendimentos,
          COALESCE(SUM(COALESCE(p.amount, s.price)), 0)::float8               AS receita,
          COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'PAID'), 0)::float8 AS receita_paga
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.establishment_id = ${ESTAB_ID}
          AND a.scheduled_at >= ${fromDate}
          AND a.scheduled_at <= ${toDate}
          AND a.status = 'DONE'
        GROUP BY a.service_type
      `,

      // Top 5 serviços
      prisma.$queryRaw<{ nome: string; count: number; receita: number }[]>`
        SELECT
          s.name                                                               AS nome,
          COUNT(*)::int                                                        AS count,
          COALESCE(SUM(COALESCE(p.amount, s.price)), 0)::float8              AS receita
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.establishment_id = ${ESTAB_ID}
          AND a.scheduled_at >= ${fromDate}
          AND a.scheduled_at <= ${toDate}
          AND a.status = 'DONE'
        GROUP BY s.name
        ORDER BY count DESC
        LIMIT 5
      `,

      // Top 5 profissionais
      prisma.$queryRaw<{ profissionalId: string; nome: string; atendimentos: number; receita: number }[]>`
        SELECT
          a.professional_id                                                    AS "profissionalId",
          u.name                                                               AS nome,
          COUNT(*)::int                                                        AS atendimentos,
          COALESCE(SUM(COALESCE(p.amount, s.price)), 0)::float8              AS receita
        FROM appointments a
        JOIN users u ON a.professional_id = u.id
        JOIN services s ON a.service_id = s.id
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.establishment_id = ${ESTAB_ID}
          AND a.scheduled_at >= ${fromDate}
          AND a.scheduled_at <= ${toDate}
          AND a.status = 'DONE'
        GROUP BY a.professional_id, u.name
        ORDER BY receita DESC
        LIMIT 5
      `,

      // Receita por método de pagamento
      prisma.$queryRaw<{ method: string; total: number }[]>`
        SELECT
          p.method::text                                                       AS method,
          COALESCE(SUM(p.amount), 0)::float8                                 AS total
        FROM appointments a
        JOIN payments p ON p.appointment_id = a.id
        WHERE a.establishment_id = ${ESTAB_ID}
          AND a.scheduled_at >= ${fromDate}
          AND a.scheduled_at <= ${toDate}
          AND a.status = 'DONE'
        GROUP BY p.method
      `,

      // Movimentos de produto agrupados por nome (sem LIMIT — produtos por estab são poucos)
      prisma.$queryRaw<{ nome: string; qtd: number; receita: number }[]>`
        SELECT
          pr.name                                                              AS nome,
          SUM(sm.quantity)::int                                               AS qtd,
          COALESCE(SUM(sm.quantity * sm.unit_price), 0)::float8              AS receita
        FROM stock_movements sm
        JOIN products pr ON sm.product_id = pr.id
        WHERE sm.type = 'SAIDA'
          AND sm.created_at >= ${fromDate}
          AND sm.created_at <= ${toDate}
          AND pr.establishment_id = ${ESTAB_ID}
        GROUP BY pr.name
        ORDER BY qtd DESC
      `,
    ])

    // ── Derivações a partir dos resultados já agregados ────────────────────

    const porStatus: Record<string, number> = {}
    for (const r of pgStatus) porStatus[r.status] = Number(r.count)

    const PENDING_SET = new Set(["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"])
    const CANCEL_SET  = new Set(["CANCELLED", "NO_SHOW"])
    const pendentes = pgStatus.filter(r => PENDING_SET.has(r.status)).reduce((s, r) => s + Number(r.count), 0)
    const cancelados = pgStatus.filter(r => CANCEL_SET.has(r.status)).reduce((s, r) => s + Number(r.count), 0)

    const atendimentos    = pgRevenue.reduce((s, r) => s + Number(r.atendimentos), 0)
    const receitaServicos = pgRevenue.reduce((s, r) => s + Number(r.receita), 0)
    const receitaProdutos = pgProdutos.reduce((s, r) => s + Number(r.receita), 0)
    const receitaAssinaturas = receitaAssinaturasPeriodo._sum.amount ?? 0

    const faturamento        = receitaServicos + receitaProdutos + receitaAssinaturas
    const ticketMedio        = atendimentos > 0 ? faturamento / atendimentos : 0
    const faturamentoRecebido =
      pgRevenue.reduce((s, r) => s + Number(r.receita_paga), 0)
      + receitaProdutos + receitaAssinaturas

    const presencialRows = pgRevenue.filter(r => r.service_type !== "HOME_VISIT")
    const domicilioRows  = pgRevenue.filter(r => r.service_type === "HOME_VISIT")

    const topServicos = pgTopServicos.map(r => ({
      nome: r.nome,
      count: Number(r.count),
      receita: arredondar(Number(r.receita)),
    }))

    const topProdutos = pgProdutos.slice(0, 5).map(r => ({
      nome: r.nome,
      qtd: Number(r.qtd),
      receita: arredondar(Number(r.receita)),
    }))

    const topProfissionais = pgTopProfissionais.map(r => ({
      profissionalId: r.profissionalId,
      nome: r.nome,
      atendimentos: Number(r.atendimentos),
      receita: arredondar(Number(r.receita)),
    }))

    const porMetodoPagamento: Record<string, number> = {}
    for (const r of pgPorMetodo) porMetodoPagamento[r.method] = arredondar(Number(r.total))

    const pagamentosPendentesCount = pagamentosPendentes._count.id + assinaturasVencidas._count.id
    const valorPendente = (pagamentosPendentes._sum.amount ?? 0) + (assinaturasVencidas._sum.price ?? 0)

    return NextResponse.json({
      periodo: { from: fromDate.toISOString(), to: toDate.toISOString() },

      faturamento:         arredondar(faturamento),
      faturamentoRecebido: arredondar(faturamentoRecebido),
      receitaServicos:     arredondar(receitaServicos),
      receitaProdutos:     arredondar(receitaProdutos),
      receitaAssinaturas:  arredondar(receitaAssinaturas),

      atendimentos,
      ticketMedio:         arredondar(ticketMedio),

      clientesVip,
      pendentes,
      cancelados,

      pagamentosPendentes: pagamentosPendentesCount,
      valorPendente:       arredondar(valorPendente),

      mesAtualClientes:   apptsMesAtual.length,
      mesAnteriorClientes: apptsMesAnterior.length,

      topServicos,
      topProdutos,
      topProfissionais,

      porStatus,
      porMetodoPagamento,

      agendamentosHoje: agendamentosHojeResult,

      split: {
        presencial: {
          atendimentos: presencialRows.reduce((s, r) => s + Number(r.atendimentos), 0),
          receita:      arredondar(presencialRows.reduce((s, r) => s + Number(r.receita), 0)),
        },
        domicilio: {
          atendimentos: domicilioRows.reduce((s, r) => s + Number(r.atendimentos), 0),
          receita:      arredondar(domicilioRows.reduce((s, r) => s + Number(r.receita), 0)),
        },
      },
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=180" },
    })
  } catch (error) {
    console.error("[GET /api/dashboard]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
