import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ClientSegment, AppointmentStatus, SubscriptionStatus } from "@prisma/client"
import { limitesHojeBRT, anoMesAtualBRT, limitesMesBRT } from "@/lib/data-brt"

function arredondar(v: number) { return Math.round(v * 100) / 100 }

const ROLES_BARBEIRO = ["BARBER_CLT", "BARBER_MEI", "AUTONOMO"]

type GrupoAgendamentos = {
  status: string
  serviceType: string
  servico: string
  profId: string
  profNome: string
  metodo: string | null
  pagStatus: string | null
  n: number
  receita: number
  pago: number
}

function parsePeriodo(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam   = searchParams.get("to")
  const { inicio: hojeInicio, fim: hojeFim } = limitesHojeBRT()
  // Com offset explícito: sem ele o servidor (UTC na Vercel) começava o dia
  // às 21h do dia anterior no horário de Brasília.
  const fromDate  = fromParam ? new Date(`${fromParam}T00:00:00-03:00`) : hojeInicio
  const toDate    = toParam ? new Date(`${toParam}T23:59:59-03:00`) : hojeFim
  return { fromDate, toDate }
}

export async function GET(request: Request) {
  try {
    const session  = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { fromDate, toDate } = parsePeriodo(request)

    const { inicio: hojeInicio, fim: hojeFim } = limitesHojeBRT()
    const { ano: anoAtual, mes: mesAtual } = anoMesAtualBRT()
    const { inicio: mesAtualStart, fim: mesAtualEnd } = limitesMesBRT(anoAtual, mesAtual)
    const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
    const { inicio: mesAnteriorStart, fim: mesAnteriorEnd } = limitesMesBRT(anoMesAnterior, mesAnterior)

    const periodoIncluiHoje = toDate >= hojeInicio

    // Barbeiro só vê os próprios atendimentos no widget "Agenda de hoje" —
    // mesma regra do /api/agendamentos, pra não expor cliente/horário de
    // outros profissionais pra quem só devia ver a própria agenda.
    const souBarbeiro = ROLES_BARBEIRO.includes(session?.user?.role ?? "")
    const whereAgendamentosHoje: any = { establishmentId: ESTAB_ID, scheduledAt: { gte: hojeInicio, lte: hojeFim } }
    if (souBarbeiro) whereAgendamentosHoje.professionalId = session?.user?.id

    const [
      clientesVip,
      agendamentosHojeResult,
      apptsMesAtual,
      apptsMesAnterior,
      pagamentosPendentes,
      assinaturasVencidas,
      receitaAssinaturasPeriodo,
      appointments,
      stockMovements,
    ] = await Promise.all([

      prisma.client.count({
        where: { establishmentId: ESTAB_ID, segment: ClientSegment.VIP },
      }),

      periodoIncluiHoje
        ? prisma.appointment.findMany({
            where: whereAgendamentosHoje,
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
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE] },
          nextBillingAt: { lte: new Date() },
          client: { establishmentId: ESTAB_ID },
        },
        _count: { id: true },
        _sum:   { price: true },
      }),

      prisma.transaction.aggregate({
        where: {
          type: "RECEITA",
          description: { startsWith: "Assinatura ·" },
          createdAt: { gte: fromDate, lte: toDate },
          cashRegister: { establishmentId: ESTAB_ID },
        },
        _sum: { amount: true },
      }),

      // Agendamentos do período, já agrupados no banco. Antes vinha uma linha
      // por agendamento (o ano inteiro, no filtro "ano") para somar em JS; agora
      // vem uma linha por combinação status × tipo × serviço × profissional ×
      // pagamento, com contagem e somas. A regra de receita é a mesma:
      // valor pago, ou o preço do serviço quando não há pagamento.
      prisma.$queryRaw<GrupoAgendamentos[]>`
        SELECT a.status::text              AS status,
               a."serviceType"::text       AS "serviceType",
               s.name                      AS servico,
               a."professionalId"          AS "profId",
               u.name                      AS "profNome",
               p.method::text              AS metodo,
               p.status::text              AS "pagStatus",
               COUNT(*)::int               AS n,
               SUM(COALESCE(p.amount, s.price))::float8 AS receita,
               SUM(COALESCE(p.amount, 0))::float8       AS pago
          FROM appointments a
          JOIN services s ON s.id = a."serviceId"
          JOIN users u    ON u.id = a."professionalId"
          LEFT JOIN payments p ON p."appointmentId" = a.id
         WHERE a."establishmentId" = ${ESTAB_ID}
           AND a."scheduledAt" >= ${fromDate} AND a."scheduledAt" <= ${toDate}
         GROUP BY 1, 2, 3, 4, 5, 6, 7`,

      // Movimentos de estoque do período
      prisma.stockMovement.findMany({
        where: {
          type: "SAIDA",
          createdAt: { gte: fromDate, lte: toDate },
          product: { establishmentId: ESTAB_ID },
        },
        select: {
          quantity: true,
          unitPrice: true,
          product: { select: { name: true } },
        },
      }),
    ])

    // ── Agregação a partir dos grupos ────────────────────────────────────────

    const PENDING_SET = new Set<string>(["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"])
    const CANCEL_SET  = new Set<string>(["CANCELLED", "NO_SHOW"])

    const grupos = appointments
    const gruposDone = grupos.filter(g => g.status === AppointmentStatus.DONE)
    const soma = (lista: GrupoAgendamentos[], f: (g: GrupoAgendamentos) => number) =>
      lista.reduce((s, g) => s + f(g), 0)

    const pendentes  = soma(grupos.filter(g => PENDING_SET.has(g.status)), g => g.n)
    const cancelados = soma(grupos.filter(g => CANCEL_SET.has(g.status)), g => g.n)

    const porStatus: Record<string, number> = {}
    for (const g of grupos) porStatus[g.status] = (porStatus[g.status] ?? 0) + g.n

    const atendimentos    = soma(gruposDone, g => g.n)
    const receitaServicos = soma(gruposDone, g => g.receita)
    const receitaProdutos = stockMovements.reduce((s, m) => s + m.quantity * (m.unitPrice ?? 0), 0)
    const receitaAssinaturas = receitaAssinaturasPeriodo._sum.amount ?? 0
    const faturamento        = receitaServicos + receitaProdutos + receitaAssinaturas
    const faturamentoRecebido =
      soma(gruposDone, g => (g.pagStatus === "PAID" ? g.pago : 0))
      + receitaProdutos + receitaAssinaturas
    const ticketMedio = atendimentos > 0 ? faturamento / atendimentos : 0

    const presencialGrupos = gruposDone.filter(g => g.serviceType !== "HOME_VISIT")
    const domicilioGrupos  = gruposDone.filter(g => g.serviceType === "HOME_VISIT")

    // Top serviços
    const svcMap: Record<string, { nome: string; count: number; receita: number }> = {}
    for (const g of gruposDone) {
      const nome = g.servico
      if (!svcMap[nome]) svcMap[nome] = { nome, count: 0, receita: 0 }
      svcMap[nome].count += g.n
      svcMap[nome].receita += g.receita
    }
    // Empate: maior receita, depois nome — ordem estável (antes dependia da
    // ordem em que as linhas vinham do banco)
    const topServicos = Object.values(svcMap)
      .sort((a, b) => b.count - a.count || b.receita - a.receita || a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 5)
      .map(s => ({ ...s, receita: arredondar(s.receita) }))

    // Top produtos
    const prodMap: Record<string, { nome: string; qtd: number; receita: number }> = {}
    for (const m of stockMovements) {
      const nome = m.product.name
      if (!prodMap[nome]) prodMap[nome] = { nome, qtd: 0, receita: 0 }
      prodMap[nome].qtd += m.quantity
      prodMap[nome].receita += m.quantity * (m.unitPrice ?? 0)
    }
    const topProdutos = Object.values(prodMap)
      .sort((a, b) => b.qtd - a.qtd || b.receita - a.receita || a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 5)
      .map(p => ({ ...p, receita: arredondar(p.receita) }))

    // Top profissionais
    const profMap: Record<string, { profissionalId: string; nome: string; atendimentos: number; receita: number }> = {}
    for (const g of gruposDone) {
      const id = g.profId
      if (!profMap[id]) profMap[id] = { profissionalId: id, nome: g.profNome, atendimentos: 0, receita: 0 }
      profMap[id].atendimentos += g.n
      profMap[id].receita += g.receita
    }
    const topProfissionais = Object.values(profMap)
      .sort((a, b) => b.receita - a.receita || b.atendimentos - a.atendimentos || a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 5)
      .map(p => ({ ...p, receita: arredondar(p.receita) }))

    // Por método de pagamento
    const porMetodoPagamento: Record<string, number> = {}
    for (const g of gruposDone) {
      if (g.pagStatus === "PAID" && g.metodo) {
        porMetodoPagamento[g.metodo] = arredondar((porMetodoPagamento[g.metodo] ?? 0) + g.pago)
      }
    }

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

      mesAtualClientes:    apptsMesAtual.length,
      mesAnteriorClientes: apptsMesAnterior.length,

      topServicos,
      topProdutos,
      topProfissionais,

      porStatus,
      porMetodoPagamento,

      agendamentosHoje: agendamentosHojeResult,

      split: {
        presencial: {
          atendimentos: soma(presencialGrupos, g => g.n),
          receita:      arredondar(soma(presencialGrupos, g => g.receita)),
        },
        domicilio: {
          atendimentos: soma(domicilioGrupos, g => g.n),
          receita:      arredondar(soma(domicilioGrupos, g => g.receita)),
        },
      },
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=180" },
    })
  } catch (error) {
    console.error("[GET /api/dashboard]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
