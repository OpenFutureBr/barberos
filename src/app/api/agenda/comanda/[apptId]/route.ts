import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { verificarCoberturaAssinatura, consumirCorteAssinatura } from "@/lib/assinatura"

type MetodoEntrada =
  | "PIX"
  | "CASH"
  | "CARD"
  | "CARD_CREDITO"
  | "CARD_DEBITO"
  | "DINHEIRO"
  | "CREDITO"
  | "DEBITO"
  | "PAY_LATER"

function normalizarMetodo(method: MetodoEntrada | string | undefined) {
  if (!method) return "PIX"

  const m = String(method).toUpperCase()

  if (m === "DINHEIRO") return "CASH"
  if (m === "CREDITO") return "CARD"
  if (m === "DEBITO") return "CARD"
  if (m === "CARD_CREDITO") return "CARD"
  if (m === "CARD_DEBITO") return "CARD"

  if (m === "PAY_LATER") return "PAY_LATER"
  if (m === "CASH") return "CASH"
  if (m === "CARD") return "CARD"
  if (m === "PIX") return "PIX"

  return "PIX"
}

function parseValor(valor: unknown) {
  if (typeof valor === "number") return valor

  if (typeof valor === "string") {
    const n = Number(valor.replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }

  return 0
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ apptId: string }> },
) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { apptId } = await params

    const [appt, movimentos] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: apptId, establishmentId: estabId },
        include: {
          client: { select: { name: true, phone: true } },
          service: { select: { name: true, price: true, durationMin: true, category: true } },
          professional: { select: { name: true } },
          payment: {
            select: {
              id: true,
              method: true,
              status: true,
              amount: true,
              dueDate: true,
              pixStatus: true,
              pixPaidAt: true,
              createdAt: true,
            },
          },
        },
      }),

      prisma.stockMovement.findMany({
        where: { appointmentId: apptId, type: "SAIDA" },
        include: { product: { select: { name: true, salePrice: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ])

    if (!appt) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 },
      )
    }

    const cobertura = await verificarCoberturaAssinatura(appt.clientId, appt.service, appt.serviceType)

    return NextResponse.json({ appt, movimentos, cobertura })
  } catch (error) {
    console.error("[GET /api/agenda/comanda]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ apptId: string }> },
) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { apptId } = await params
    const body = await request.json().catch(() => ({}))

    const appt = await prisma.appointment.findUnique({
      where: { id: apptId, establishmentId: estabId },
      include: {
        service: { select: { price: true, category: true } },
      },
    })

    if (!appt) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 },
      )
    }

    const method = normalizarMetodo(body.method)

    /**
     * Valor cobrado = produtos consumidos + o corte, EXCETO quando o
     * cliente tem assinatura ativa que cobre esse serviço e ainda tem corte
     * incluso disponível no mês — nesse caso o corte não é cobrado, só os
     * produtos. `produtos` é o total de produtos da comanda; mantemos
     * compatibilidade com `amount` (uso antigo, todo o valor incluindo o
     * corte) para não quebrar chamadas antigas.
     */
    const cobertura = await verificarCoberturaAssinatura(appt.clientId, appt.service, appt.serviceType)
    const corteGratis = cobertura.coberto && cobertura.dentroDaQuota

    const produtosInformado = body.produtos !== undefined ? parseValor(body.produtos) : null
    const amount = produtosInformado !== null
      ? produtosInformado + (corteGratis ? 0 : appt.service.price)
      : (() => {
          const amountInformado = parseValor(body.amount)
          return amountInformado > 0 ? amountInformado : appt.service.price
        })()

    const isPagarDepois = method === "PAY_LATER"
    const dueDate = body.dueDate ? new Date(body.dueDate) : null

    if (isPagarDepois && !dueDate) {
      return NextResponse.json(
        { error: "Informe a data de vencimento para pagamento posterior." },
        { status: 400 },
      )
    }

    const status =
      method === "PAY_LATER" || method === "PIX" ? "PENDING" : "PAID"

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: apptId },
        data: { status: "DONE" },
      })

      await tx.payment.upsert({
        where: { appointmentId: apptId },
        update: {
          method,
          status,
          amount,
          dueDate: isPagarDepois ? dueDate : null,
          pixStatus: method === "PIX" ? "PENDING" : "PAID",
          pixPaidAt: status === "PAID" ? new Date() : null,
        },
        create: {
          appointmentId: apptId,
          method,
          status,
          amount,
          dueDate: isPagarDepois ? dueDate : null,
          pixStatus: method === "PIX" ? "PENDING" : "PAID",
          pixPaidAt: status === "PAID" ? new Date() : null,
        },
      })
    })

    if (corteGratis && !isPagarDepois) {
      await consumirCorteAssinatura(appt.clientId).catch(() => {})
    }

    return NextResponse.json({
      ok: true,
      payment: {
        method,
        status,
        amount,
        dueDate: isPagarDepois ? dueDate : null,
      },
      cobertoPelaAssinatura: corteGratis,
    })
  } catch (error) {
    console.error("[PUT /api/agenda/comanda]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}