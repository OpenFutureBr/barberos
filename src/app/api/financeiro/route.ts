import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const MESES_LABEL = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
]

const ESTAB_ID = "estab001"

type CashbackConfig = {
  servicos: number
  domicilio: number
  produtos: number
  assinaturas: number
}

const defaultCashbackConfig: CashbackConfig = {
  servicos: 7,
  domicilio: 5,
  produtos: 3,
  assinaturas: 10,
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

function inicioFimMes(ano: number, mes: number) {
  const inicio = new Date(ano, mes - 1, 1)
  const fim = new Date(ano, mes, 0, 23, 59, 59)

  return { inicio, fim }
}

function getStatusPendencia(dueDate: Date | null) {
  if (!dueDate) return "PENDING"

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const vencimento = new Date(dueDate)
  vencimento.setHours(0, 0, 0, 0)

  return vencimento < hoje ? "OVERDUE" : "PENDING"
}

async function getOuCriarCaixaHoje() {
  const hoje = new Date()
  const inicioDia = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
    0,
    0,
    0,
  )
  const fimDia = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
    23,
    59,
    59,
  )

  let caixa = await prisma.cashRegister.findFirst({
    where: {
      establishmentId: ESTAB_ID,
      openedAt: {
        gte: inicioDia,
        lte: fimDia,
      },
    },
    orderBy: {
      openedAt: "desc",
    },
  })

  if (!caixa) {
    caixa = await prisma.cashRegister.create({
      data: {
        establishmentId: ESTAB_ID,
        openingAmount: 0,
      },
    })
  }

  return caixa
}

async function getCashbackConfig(): Promise<CashbackConfig & { id?: string }> {
  try {
    const cfg = await prisma.cashbackConfig.findFirst({
      where: {
        establishmentId: ESTAB_ID,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (cfg) return cfg

    const estab = await prisma.establishment.findUnique({
      where: {
        id: ESTAB_ID,
      },
      select: {
        cashbackConfig: true,
      },
    })

    if (estab?.cashbackConfig && typeof estab.cashbackConfig === "object") {
      return {
        ...defaultCashbackConfig,
        ...(estab.cashbackConfig as object),
      }
    }
  } catch {}

  return defaultCashbackConfig
}

function calcularNivel(totalGasto: number): "BRONZE" | "SILVER" | "GOLD" | "VIP" {
  if (totalGasto >= 5000) return "VIP"
  if (totalGasto >= 2000) return "GOLD"
  if (totalGasto >= 500) return "SILVER"

  return "BRONZE"
}

async function calcularSegmento(
  clientId: string,
  novoTotalAtend: number,
): Promise<string> {
  const sub = await prisma.subscription.findUnique({
    where: {
      clientId,
    },
    select: {
      status: true,
    },
  })

  if (sub?.status === "ACTIVE") return "VIP"

  const trintaDias = new Date()
  trintaDias.setDate(trintaDias.getDate() - 30)

  const recentes = await prisma.appointment.count({
    where: {
      clientId,
      status: "DONE" as any,
      scheduledAt: {
        gte: trintaDias,
      },
    },
  })

  if (recentes >= 5) return "VIP"
  if (novoTotalAtend <= 2) return "NEW"
  if (novoTotalAtend <= 9) return "REGULAR"
  if (novoTotalAtend <= 19) return "AT_RISK"

  return "INACTIVE"
}

async function creditarCashbackPagamentoConfirmado(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      appointment: {
        include: {
          client: true,
          service: true,
        },
      },
    },
  })

  if (!payment) return
  if (payment.status !== "PAID") return
  if (payment.cashbackGenerated > 0) return

  const appt = payment.appointment
  const client = appt.client

  if (!client) return

  const cashbackCfg = await getCashbackConfig()

  const valorPago = payment.amount
  const valorServico = Math.min(appt.service?.price ?? 0, valorPago)
  const valorProdutos = Math.max(0, valorPago - valorServico)

  const isDomicilio = appt.serviceType === "HOME_VISIT"

  const pctServico = isDomicilio ? cashbackCfg.domicilio : cashbackCfg.servicos
  const pctProduto = cashbackCfg.produtos

  const cashbackServico = valorServico * (pctServico / 100)
  const cashbackProduto = valorProdutos * (pctProduto / 100)
  const cashbackValor = arredondar(cashbackServico + cashbackProduto)

  if (cashbackValor <= 0) return

  const descricao =
    valorProdutos > 0
      ? `${appt.service?.name ?? "Serviço"} · ${pctServico}% + produtos · ${pctProduto}%`
      : `${appt.service?.name ?? "Serviço"} · ${pctServico}%`

  const loyaltyAccount = await prisma.loyaltyAccount.upsert({
    where: {
      clientId: client.id,
    },
    create: {
      clientId: client.id,
      totalEarned: cashbackValor,
      totalRedeemed: 0,
      currentBalance: cashbackValor,
      totalPoints: Math.floor(valorPago),
    },
    update: {
      totalEarned: {
        increment: cashbackValor,
      },
      currentBalance: {
        increment: cashbackValor,
      },
      totalPoints: {
        increment: Math.floor(valorPago),
      },
    },
  })

  await prisma.loyaltyTransaction.create({
    data: {
      loyaltyAccountId: loyaltyAccount.id,
      type: "EARNED",
      amount: cashbackValor,
      description: descricao,
      servicoBase: valorServico,
      servicoRate: pctServico,
      produtoBase: valorProdutos > 0 ? valorProdutos : null,
      produtoRate: valorProdutos > 0 ? pctProduto : null,
      ...(cashbackCfg.id ? { cashbackConfigId: cashbackCfg.id } : {}),
    },
  })

  const todasAppts = await prisma.appointment.findMany({
    where: {
      clientId: client.id,
      status: {
        notIn: ["CANCELLED", "NO_SHOW"] as any,
      },
    },
    select: {
      id: true,
      service: {
        select: {
          name: true,
        },
      },
    },
  })

  const apptIds = todasAppts.map((a) => a.id)

  const todosMovs =
    apptIds.length === 0
      ? []
      : await prisma.stockMovement.findMany({
          where: {
            type: "SAIDA",
            appointmentId: {
              in: apptIds,
            },
          },
          select: {
            quantity: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        })

  const svcCount: Record<string, number> = {}

  for (const a of todasAppts) {
    if (a.service?.name) {
      svcCount[a.service.name] = (svcCount[a.service.name] ?? 0) + 1
    }
  }

  const favoritoCorte =
    Object.entries(svcCount).sort((a, b) =>
      b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "pt-BR"),
    )[0]?.[0] ?? null

  const prodCount: Record<string, number> = {}

  for (const m of todosMovs) {
    if (m.product?.name) {
      prodCount[m.product.name] = (prodCount[m.product.name] ?? 0) + m.quantity
    }
  }

  const favoritoProduto =
    Object.entries(prodCount).sort((a, b) =>
      b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "pt-BR"),
    )[0]?.[0] ?? null

  const novoTotal = client.totalSpent + valorPago
  const novasVisitas = client.totalAtendimentos + 1
  const novoTicketMedio = arredondar(novoTotal / novasVisitas)
  const novoSegmento = await calcularSegmento(client.id, novasVisitas)

  await prisma.client.update({
    where: {
      id: client.id,
    },
    data: {
      cashbackBalance: {
        increment: cashbackValor,
      },
      totalSpent: {
        increment: valorPago,
      },
      totalAtendimentos: {
        increment: 1,
      },
      ticketMedio: novoTicketMedio,
      lastVisitAt: new Date(),
      loyaltyLevel: calcularNivel(novoTotal) as any,
      segment: novoSegmento as any,
      favoritoCorte,
      favoritoProduto,
    },
  })

  await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      cashbackGenerated: cashbackValor,
    },
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const ano = parseInt(
      searchParams.get("ano") ?? String(new Date().getFullYear()),
    )
    const mes = parseInt(
      searchParams.get("mes") ?? String(new Date().getMonth() + 1),
    )

    const { inicio, fim } = inicioFimMes(ano, mes)

    const [appointments, movements, pendentes] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          establishmentId: ESTAB_ID,
          status: "DONE" as any,
          scheduledAt: {
            gte: inicio,
            lte: fim,
          },
        },
        include: {
          service: {
            select: {
              price: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              method: true,
              dueDate: true,
            },
          },
          professional: {
            select: {
              id: true,
              name: true,
              employmentType: true,
              commissionPct: true,
              benchFee: true,
              benchFeePct: true,
            },
          },
        },
      }),

      prisma.stockMovement.findMany({
        where: {
          createdAt: {
            gte: inicio,
            lte: fim,
          },
          type: "SAIDA",
        },
        select: {
          quantity: true,
          unitPrice: true,
        },
      }),

      prisma.payment.findMany({
        where: {
          status: "PENDING",
          appointment: {
            establishmentId: ESTAB_ID,
          },
        },
        include: {
          appointment: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
              service: {
                select: {
                  name: true,
                  price: true,
                },
              },
              professional: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            dueDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      }),
    ])

    /**
     * DRE:
     * Mantém sua lógica atual por competência/atendimento DONE.
     * Pendências ficam separadas em "Contas a receber".
     */
    const receitaServicos = appointments.reduce((s, a) => {
      return s + (a.payment?.amount ?? a.service.price)
    }, 0)

    const receitaProdutos = movements.reduce((s, m) => {
      return s + m.quantity * (m.unitPrice ?? 0)
    }, 0)

    const presencial = appointments.filter((a) => a.serviceType !== "HOME_VISIT")
    const domicilio = appointments.filter((a) => a.serviceType === "HOME_VISIT")

    const receitaPresencial = presencial.reduce((s, a) => {
      return s + (a.payment?.amount ?? a.service.price)
    }, 0)

    const receitaDomicilio = domicilio.reduce((s, a) => {
      return s + (a.payment?.amount ?? a.service.price)
    }, 0)

    // Repasses por profissional
    const repMap: Record<string, any> = {}

    for (const appt of appointments) {
      const prof = appt.professional
      const valorBase = appt.payment?.amount ?? appt.service.price

      if (!repMap[prof.id]) {
        repMap[prof.id] = {
          profissionalId: prof.id,
          nome: prof.name,
          tipo: prof.employmentType as string,
          commissionPct: prof.commissionPct,
          benchFee: prof.benchFee,
          benchFeePct: prof.benchFeePct,
          atendimentos: 0,
          bruto: 0,
        }
      }

      repMap[prof.id].atendimentos++
      repMap[prof.id].bruto += valorBase
    }

    const repasses = Object.values(repMap).map((p: any) => {
      let repasse = 0

      if (p.commissionPct) {
        repasse = (p.bruto * p.commissionPct) / 100
      } else if (p.benchFeePct) {
        repasse = p.bruto * (1 - p.benchFeePct / 100)
      } else if (p.benchFee) {
        // Taxa fixa: o profissional fica com o bruto menos a bancada fixa
        repasse = Math.max(0, p.bruto - p.benchFee * p.atendimentos)
      }

      return {
        ...p,
        repasse: arredondar(repasse),
        bruto: arredondar(p.bruto),
      }
    })

    // Evolução anual
    const anoInicio = new Date(ano, 0, 1)
    const anoFim = new Date(ano, 11, 31, 23, 59, 59)

    const [anoAppts, anoMovs] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          establishmentId: ESTAB_ID,
          status: "DONE" as any,
          scheduledAt: {
            gte: anoInicio,
            lte: anoFim,
          },
        },
        include: {
          service: {
            select: {
              price: true,
            },
          },
          payment: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      }),

      prisma.stockMovement.findMany({
        where: {
          createdAt: {
            gte: anoInicio,
            lte: anoFim,
          },
          type: "SAIDA",
        },
        select: {
          quantity: true,
          unitPrice: true,
          createdAt: true,
        },
      }),
    ])

    const evolucao = MESES_LABEL.map((label, i) => {
      const appts = anoAppts.filter((a) => new Date(a.scheduledAt).getMonth() === i)
      const movs = anoMovs.filter((m) => new Date(m.createdAt).getMonth() === i)

      const valor =
        appts.reduce((s, a) => s + (a.payment?.amount ?? a.service.price), 0) +
        movs.reduce((s, m) => s + m.quantity * (m.unitPrice ?? 0), 0)

      return {
        mes: i + 1,
        label,
        valor: arredondar(valor),
      }
    })

    const pendentesFormatados = pendentes.map((p) => {
      const dueDate = p.dueDate ? new Date(p.dueDate) : null

      return {
        id: p.id,
        appointmentId: p.appointmentId,
        method: p.method,
        status: getStatusPendencia(dueDate),
        paymentStatus: p.status,
        amount: p.amount,
        dueDate: p.dueDate,
        createdAt: p.createdAt,
        client: {
          id: p.appointment.client.id,
          name: p.appointment.client.name,
          phone: p.appointment.client.phone,
        },
        service: {
          name: p.appointment.service.name,
          price: p.appointment.service.price,
        },
        professional: {
          name: p.appointment.professional.name,
        },
        scheduledAt: p.appointment.scheduledAt,
      }
    })

    const totalPendente = pendentesFormatados.reduce((s, p) => {
      return s + p.amount
    }, 0)

    const totalVencido = pendentesFormatados
      .filter((p) => p.status === "OVERDUE")
      .reduce((s, p) => s + p.amount, 0)

    const totalAVencer = pendentesFormatados
      .filter((p) => p.status !== "OVERDUE")
      .reduce((s, p) => s + p.amount, 0)

    return NextResponse.json({
      dre: {
        receitaServicos: arredondar(receitaServicos),
        receitaProdutos: arredondar(receitaProdutos),
        totalReceitas: arredondar(receitaServicos + receitaProdutos),
        presencial: {
          atendimentos: presencial.length,
          receita: arredondar(receitaPresencial),
        },
        domicilio: {
          atendimentos: domicilio.length,
          receita: arredondar(receitaDomicilio),
        },
      },
      repasses,
      evolucao,
      pendentes: pendentesFormatados,
      resumoPendencias: {
        quantidade: pendentesFormatados.length,
        totalPendente: arredondar(totalPendente),
        totalVencido: arredondar(totalVencido),
        totalAVencer: arredondar(totalAVencer),
      },
    })
  } catch (error) {
    console.error("[GET /api/financeiro]", error)

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action !== "marcar-pago") {
      return NextResponse.json(
        {
          error: "Ação inválida",
        },
        {
          status: 400,
        },
      )
    }

    const paymentId = String(body.paymentId ?? "")
    const method = String(body.method ?? "CASH").toUpperCase()

    if (!paymentId) {
      return NextResponse.json(
        {
          error: "Pagamento não informado.",
        },
        {
          status: 400,
        },
      )
    }

    const pagamento = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        appointment: {
          include: {
            client: {
              select: {
                name: true,
              },
            },
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!pagamento) {
      return NextResponse.json(
        {
          error: "Pagamento não encontrado.",
        },
        {
          status: 404,
        },
      )
    }

    if (pagamento.status === "PAID") {
      return NextResponse.json({
        ok: true,
        message: "Pagamento já estava quitado.",
      })
    }

    const METODOS_VALIDOS = ["PIX", "CARD", "CASH", "CASHBACK", "SUBSCRIPTION"]
    if (!METODOS_VALIDOS.includes(method)) {
      return NextResponse.json(
        { error: `Método de pagamento inválido: ${method}` },
        { status: 400 },
      )
    }
    const methodFinal = method

    const caixa = await getOuCriarCaixaHoje()

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          status: "PAID",
          method: methodFinal as any,
          pixStatus: methodFinal === "PIX" ? "PAID" : pagamento.pixStatus,
          pixPaidAt: methodFinal === "PIX" ? new Date() : pagamento.pixPaidAt,
        },
      })

      await tx.transaction.create({
        data: {
          cashRegisterId: caixa.id,
          type: "RECEITA",
          amount: pagamento.amount,
          description: `Recebimento pendente · ${pagamento.appointment.service.name} — ${pagamento.appointment.client.name}`,
          method: methodFinal,
        },
      })
    })

    /**
     * Regra:
     * cashback só é gerado após pagamento confirmado.
     * Como acabamos de mudar para PAID, agora podemos creditar.
     * A função tem trava para não duplicar cashbackGenerated.
     */
    await creditarCashbackPagamentoConfirmado(paymentId)

    return NextResponse.json({
      ok: true,
      paymentId,
      method: methodFinal,
    })
  } catch (error) {
    console.error("[POST /api/financeiro]", error)

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