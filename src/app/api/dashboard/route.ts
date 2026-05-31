import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const ESTAB_ID = "estab001"

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

function parsePeriodo(request: Request) {
  const { searchParams } = new URL(request.url)

  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")

  const hoje = new Date()

  const fromDate = fromParam
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)

  const toDate = toParam
    ? new Date(`${toParam}T23:59:59`)
    : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

  return { fromDate, toDate }
}

export async function GET(request: Request) {
  try {
    const { fromDate, toDate } = parsePeriodo(request)

    const now = new Date()

    // Agendamentos do dia (para a listagem da home — elimina chamada duplicada ao /api/agendamentos)
    const hojeInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const hojeFim = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const mesAtualStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const mesAtualEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    )

    const mesAnteriorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const mesAnteriorEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    )

    const [
      appointments,
      movements,
      clientesVip,
      agendamentosHoje,
      apptsMesAtual,
      apptsMesAnterior,
      pagamentosPendentes,
      assinaturasVencidas,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          establishmentId: ESTAB_ID,
          scheduledAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: {
          id: true,
          status: true,
          serviceType: true,
          scheduledAt: true,
          clientId: true,
          professionalId: true,
          service: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          professional: {
            select: {
              id: true,
              name: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              method: true,
              status: true,
            },
          },
        },
      }),

      prisma.stockMovement.findMany({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
          type: "SAIDA",
          product: {
            establishmentId: ESTAB_ID,
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
          appointmentId: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      prisma.client.count({
        where: {
          establishmentId: ESTAB_ID,
          segment: "VIP" as any,
        },
      }),

      prisma.appointment.findMany({
        where: {
          establishmentId: ESTAB_ID,
          scheduledAt: { gte: hojeInicio, lte: hojeFim },
        },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          client: { select: { id: true, name: true, phone: true } },
          professional: { select: { id: true, name: true } },
          service: { select: { id: true, name: true, price: true, durationMin: true } },
          payment: { select: { amount: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),

      prisma.appointment.groupBy({
        by: ["clientId"],
        where: {
          establishmentId: ESTAB_ID,
          status: "DONE" as any,
          scheduledAt: { gte: mesAtualStart, lte: mesAtualEnd },
        },
      }),

      prisma.appointment.groupBy({
        by: ["clientId"],
        where: {
          establishmentId: ESTAB_ID,
          status: "DONE" as any,
          scheduledAt: { gte: mesAnteriorStart, lte: mesAnteriorEnd },
        },
      }),

      prisma.payment.aggregate({
        where: {
          status: "PENDING",
          appointment: { establishmentId: ESTAB_ID },
        },
        _count: { id: true },
        _sum: { amount: true },
      }),

      // Assinaturas vencidas (nextBillingAt <= hoje, status ACTIVE ou OVERDUE)
      prisma.subscription.aggregate({
        where: {
          status: { in: ["ACTIVE", "OVERDUE"] as any },
          nextBillingAt: { lte: now },
          client: { establishmentId: ESTAB_ID },
        },
        _count: { id: true },
        _sum: { price: true },
      }),
    ])

    const pagamentosPendentesCount = pagamentosPendentes._count.id + assinaturasVencidas._count.id
    const valorPendente = (pagamentosPendentes._sum.amount ?? 0) + (assinaturasVencidas._sum.price ?? 0)

    const doneAppts = appointments.filter((a) => a.status === "DONE")

    const pendentes = appointments.filter((a) =>
      ["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"].includes(
        String(a.status),
      ),
    ).length

    const cancelados = appointments.filter((a) =>
      ["CANCELLED", "NO_SHOW"].includes(String(a.status)),
    ).length

    const porStatus = appointments.reduce<Record<string, number>>((acc, appt) => {
      const status = String(appt.status)
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    }, {})

    const donePresencial = doneAppts.filter(
      (a) => a.serviceType !== "HOME_VISIT",
    )

    const doneDomicilio = doneAppts.filter(
      (a) => a.serviceType === "HOME_VISIT",
    )

    const receitaPresencial = donePresencial.reduce((s, a) => {
      return s + (a.payment?.amount ?? a.service.price)
    }, 0)

    const receitaDomicilio = doneDomicilio.reduce((s, a) => {
      return s + (a.payment?.amount ?? a.service.price)
    }, 0)

    const receitaServicos = doneAppts.reduce((s, a) => {
      return s + (a.payment?.amount ?? a.service.price)
    }, 0)

    const receitaProdutos = movements.reduce((s, m) => {
      return s + m.quantity * (m.unitPrice ?? 0)
    }, 0)

    /**
     * Receita efetivamente confirmada/paga.
     * Aqui pagamentos PAY_LATER pendentes não entram.
     */
    const faturamentoRecebido =
      doneAppts.reduce((s, a) => {
        if (a.payment?.status === "PAID") return s + a.payment.amount
        return s
      }, 0) + receitaProdutos

    const faturamento = receitaServicos + receitaProdutos
    const atendimentos = doneAppts.length
    const ticketMedio = atendimentos > 0 ? faturamento / atendimentos : 0

    /**
     * Top serviços
     */
    const svcMap: Record<
      string,
      {
        nome: string
        count: number
        receita: number
      }
    > = {}

    for (const a of doneAppts) {
      const nome = a.service.name
      const valor = a.payment?.amount ?? a.service.price

      if (!svcMap[nome]) {
        svcMap[nome] = {
          nome,
          count: 0,
          receita: 0,
        }
      }

      svcMap[nome].count += 1
      svcMap[nome].receita += valor
    }

    const topServicos = Object.values(svcMap)
      .map((s) => ({
        ...s,
        receita: arredondar(s.receita),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    /**
     * Top produtos
     */
    const prodMap: Record<
      string,
      {
        nome: string
        qtd: number
        receita: number
      }
    > = {}

    for (const m of movements) {
      const nome = m.product?.name
      if (!nome) continue

      if (!prodMap[nome]) {
        prodMap[nome] = {
          nome,
          qtd: 0,
          receita: 0,
        }
      }

      prodMap[nome].qtd += m.quantity
      prodMap[nome].receita += m.quantity * (m.unitPrice ?? 0)
    }

    const topProdutos = Object.values(prodMap)
      .map((p) => ({
        ...p,
        receita: arredondar(p.receita),
      }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5)

    /**
     * Top profissionais
     */
    const profMap: Record<
      string,
      {
        profissionalId: string
        nome: string
        atendimentos: number
        receita: number
      }
    > = {}

    for (const a of doneAppts) {
      const id = a.professionalId
      const nome = a.professional?.name ?? "Profissional"
      const valor = a.payment?.amount ?? a.service.price

      if (!profMap[id]) {
        profMap[id] = {
          profissionalId: id,
          nome,
          atendimentos: 0,
          receita: 0,
        }
      }

      profMap[id].atendimentos += 1
      profMap[id].receita += valor
    }

    const topProfissionais = Object.values(profMap)
      .map((p) => ({
        ...p,
        receita: arredondar(p.receita),
      }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5)

    /**
     * Faturamento por método de pagamento.
     * Mantive todos com payment, inclusive pendentes,
     * porque pode ser útil para leitura operacional.
     */
    const porMetodoPagamento = doneAppts.reduce<Record<string, number>>(
      (acc, a) => {
        if (!a.payment) return acc

        const metodo = String(a.payment.method ?? "SEM_METODO")
        acc[metodo] = (acc[metodo] ?? 0) + a.payment.amount

        return acc
      },
      {},
    )

    for (const metodo of Object.keys(porMetodoPagamento)) {
      porMetodoPagamento[metodo] = arredondar(porMetodoPagamento[metodo])
    }

    const mesAtualClientes = apptsMesAtual.length
    const mesAnteriorClientes = apptsMesAnterior.length

    return NextResponse.json({
      periodo: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },

      faturamento: arredondar(faturamento),
      faturamentoRecebido: arredondar(faturamentoRecebido),
      receitaServicos: arredondar(receitaServicos),
      receitaProdutos: arredondar(receitaProdutos),

      atendimentos,
      ticketMedio: arredondar(ticketMedio),

      clientesVip,
      pendentes,
      cancelados,

      pagamentosPendentes: pagamentosPendentesCount,
      valorPendente: arredondar(valorPendente),

      mesAtualClientes,
      mesAnteriorClientes,

      topServicos,
      topProdutos,
      topProfissionais,

      porStatus,
      porMetodoPagamento,

      agendamentosHoje,

      split: {
        presencial: {
          atendimentos: donePresencial.length,
          receita: arredondar(receitaPresencial),
        },
        domicilio: {
          atendimentos: doneDomicilio.length,
          receita: arredondar(receitaDomicilio),
        },
      },
    })
  } catch (error) {
    console.error("[GET /api/dashboard]", error)

    return NextResponse.json(
      {
        error: String(error),
      },
      {
        status: 500,
      },
    )
  }
}