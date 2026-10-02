import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"


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

async function getOuCriarCaixaHoje(ESTAB_ID: string) {
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

async function getCashbackConfig(ESTAB_ID: string): Promise<CashbackConfig & { id?: string }> {
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

async function creditarCashbackPagamentoConfirmado(paymentId: string, ESTAB_ID: string) {
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

  const cashbackCfg = await getCashbackConfig(ESTAB_ID)

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

// GET removido: nenhuma tela usava (o Financeiro busca por /api/financeiro/*).
// Carregava o ano inteiro em 7 consultas, 5 concorrentes num pool de 4.

export async function POST(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "financeiro")
    if (bloqueio) return bloqueio

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

    const METODOS_VALIDOS = ["PIX", "CARD", "CASH", "CASHBACK", "SUBSCRIPTION"]
    if (!METODOS_VALIDOS.includes(method)) {
      return NextResponse.json(
        { error: `Método de pagamento inválido: ${method}` },
        { status: 400 },
      )
    }
    const methodFinal = method

    // ── Tenta como Payment primeiro ──────────────────────────────────────────
    const pagamento = await prisma.payment.findFirst({
      where: { id: paymentId, appointment: { establishmentId: ESTAB_ID } },
      include: {
        appointment: {
          include: {
            client: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
    })

    // ── Se não é Payment, verifica se é Subscription ─────────────────────────
    if (!pagamento) {
      const assinatura = await prisma.subscription.findFirst({
        where: { id: paymentId, client: { establishmentId: ESTAB_ID } },
        include: {
          client: { select: { id: true, name: true } },
          plan: { select: { name: true } },
        },
      })

      if (!assinatura) {
        return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 })
      }

      const caixa = await getOuCriarCaixaHoje(ESTAB_ID)

      // Avança nextBillingAt em 1 mês e volta para ACTIVE
      const proximoVencimento = new Date(assinatura.nextBillingAt)
      proximoVencimento.setMonth(proximoVencimento.getMonth() + 1)

      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: paymentId },
          data: {
            status: "ACTIVE" as any,
            nextBillingAt: proximoVencimento,
          },
        })

        await tx.transaction.create({
          data: {
            cashRegisterId: caixa.id,
            type: "RECEITA",
            amount: assinatura.price,
            description: `Assinatura · ${assinatura.plan.name} — ${assinatura.client.name}`,
            method: methodFinal,
          },
        })
      })

      return NextResponse.json({
        ok: true,
        subscriptionId: paymentId,
        proximoVencimento: proximoVencimento.toISOString(),
        method: methodFinal,
      })
    }

    // ── Fluxo normal de Payment ───────────────────────────────────────────────
    if (pagamento.status === "PAID") {
      return NextResponse.json({ ok: true, message: "Pagamento já estava quitado." })
    }

    const caixa = await getOuCriarCaixaHoje(ESTAB_ID)

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
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

    await creditarCashbackPagamentoConfirmado(paymentId, ESTAB_ID)

    return NextResponse.json({
      ok: true,
      paymentId,
      method: methodFinal,
    })
  } catch (error) {
    console.error("[POST /api/financeiro]", error)

    return NextResponse.json(
      {
        error: "Erro interno. Tente novamente.",
      },
      {
        status: 500,
      },
    )
  }
}