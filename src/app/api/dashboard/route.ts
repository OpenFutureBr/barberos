import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ClientSegment, AppointmentStatus, SubscriptionStatus } from "@prisma/client"
import { limitesHojeBRT, anoMesAtualBRT, limitesMesBRT } from "@/lib/data-brt"

function arredondar(v: number) { return Math.round(v * 100) / 100 }

const ROLES_BARBEIRO = ["BARBER_CLT", "BARBER_MEI", "AUTONOMO"]

function parsePeriodo(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam   = searchParams.get("to")
  const { inicio: hojeInicio, fim: hojeFim } = limitesHojeBRT()
  const fromDate  = fromParam ? new Date(`${fromParam}T00:00:00`) : hojeInicio
  const toDate    = toParam ? new Date(`${toParam}T23:59:59`) : hojeFim
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

      // Agendamentos do período para agregação
      prisma.appointment.findMany({
        where: { establishmentId: ESTAB_ID, scheduledAt: { gte: fromDate, lte: toDate } },
        select: {
          status: true,
          serviceType: true,
          service:      { select: { name: true, price: true } },
          payment:      { select: { amount: true, method: true, status: true } },
          professional: { select: { id: true, name: true } },
        },
      }),

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

    // ── Agregação JS ──────────────────────────────────────────────────────────

    const PENDING_SET = new Set<string>(["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"])
    const CANCEL_SET  = new Set<string>(["CANCELLED", "NO_SHOW"])

    const doneAppts = appointments.filter(a => a.status === AppointmentStatus.DONE)
    const pendentes = appointments.filter(a => PENDING_SET.has(a.status)).length
    const cancelados = appointments.filter(a => CANCEL_SET.has(a.status)).length

    const porStatus: Record<string, number> = {}
    for (const a of appointments) porStatus[a.status] = (porStatus[a.status] ?? 0) + 1

    const atendimentos    = doneAppts.length
    const receitaServicos = doneAppts.reduce((s, a) => s + (a.payment?.amount ?? a.service.price), 0)
    const receitaProdutos = stockMovements.reduce((s, m) => s + m.quantity * (m.unitPrice ?? 0), 0)
    const receitaAssinaturas = receitaAssinaturasPeriodo._sum.amount ?? 0
    const faturamento        = receitaServicos + receitaProdutos + receitaAssinaturas
    const faturamentoRecebido =
      doneAppts.reduce((s, a) => s + (a.payment?.status === "PAID" ? (a.payment?.amount ?? 0) : 0), 0)
      + receitaProdutos + receitaAssinaturas
    const ticketMedio = atendimentos > 0 ? faturamento / atendimentos : 0

    const presencialAppts = doneAppts.filter(a => a.serviceType !== "HOME_VISIT")
    const domicilioAppts  = doneAppts.filter(a => a.serviceType === "HOME_VISIT")

    // Top serviços
    const svcMap: Record<string, { nome: string; count: number; receita: number }> = {}
    for (const a of doneAppts) {
      const nome = a.service.name
      if (!svcMap[nome]) svcMap[nome] = { nome, count: 0, receita: 0 }
      svcMap[nome].count++
      svcMap[nome].receita += a.payment?.amount ?? a.service.price
    }
    const topServicos = Object.values(svcMap)
      .sort((a, b) => b.count - a.count)
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
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5)
      .map(p => ({ ...p, receita: arredondar(p.receita) }))

    // Top profissionais
    const profMap: Record<string, { profissionalId: string; nome: string; atendimentos: number; receita: number }> = {}
    for (const a of doneAppts) {
      const { id, name } = a.professional
      if (!profMap[id]) profMap[id] = { profissionalId: id, nome: name, atendimentos: 0, receita: 0 }
      profMap[id].atendimentos++
      profMap[id].receita += a.payment?.amount ?? a.service.price
    }
    const topProfissionais = Object.values(profMap)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5)
      .map(p => ({ ...p, receita: arredondar(p.receita) }))

    // Por método de pagamento
    const porMetodoPagamento: Record<string, number> = {}
    for (const a of doneAppts) {
      if (a.payment?.status === "PAID" && a.payment.method) {
        const m = String(a.payment.method)
        porMetodoPagamento[m] = arredondar((porMetodoPagamento[m] ?? 0) + (a.payment.amount ?? 0))
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
          atendimentos: presencialAppts.length,
          receita:      arredondar(presencialAppts.reduce((s, a) => s + (a.payment?.amount ?? a.service.price), 0)),
        },
        domicilio: {
          atendimentos: domicilioAppts.length,
          receita:      arredondar(domicilioAppts.reduce((s, a) => s + (a.payment?.amount ?? a.service.price), 0)),
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
