import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"
import { gravarCreditoCashback } from "@/lib/cashback"


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

  // Gravações numa transação, com proteção contra crédito duplo (lib/cashback)
  await gravarCreditoCashback({
    paymentId: payment.id,
    client,
    valorPago,
    cashbackValor,
    descricao,
    servicoBase: valorServico,
    servicoRate: pctServico,
    produtoBase: valorProdutos > 0 ? valorProdutos : null,
    produtoRate: valorProdutos > 0 ? pctProduto : null,
    cashbackConfigId: cashbackCfg.id,
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

      // Próximo vencimento = 1 mês a partir do vencimento atual ou de hoje, o que
      // for mais tarde (mesma regra de /api/assinaturas/assinantes/[id]/renovar).
      // Somar 1 mês a um vencimento antigo deixava a assinatura ainda vencida:
      // o recebimento entrava no caixa e a cobrança seguia em "A cobrar".
      const agora = new Date()
      const proximoVencimento = new Date(assinatura.nextBillingAt > agora ? assinatura.nextBillingAt : agora)
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