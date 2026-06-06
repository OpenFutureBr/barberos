import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Endpoint para vendas avulsas (sem agendamento)
// Chamado pelo PagamentoModal via endpointOverride


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
  if (m === "PIX") return "PIX"
  if (m === "CASH") return "CASH"
  if (m === "CARD") return "CARD"

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

function nomeMetodo(method: string) {
  if (method === "PIX") return "PIX"
  if (method === "CASH") return "Dinheiro"
  if (method === "CARD") return "Cartão"
  if (method === "PAY_LATER") return "Pagar depois"

  return method
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

export async function POST(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await request.json()

    const method = normalizarMetodo(body.method)
    const amount = parseValor(body.amount)
    const clientId = body.clientId ? String(body.clientId) : null
    const items = Array.isArray(body.items) ? body.items : []
    const dueDate = body.dueDate ? new Date(body.dueDate) : null

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Valor da venda inválido." },
        { status: 400 },
      )
    }

    /**
     * IMPORTANTE:
     *
     * Venda avulsa não possui Appointment.
     * Seu model Payment exige appointmentId obrigatório e único.
     *
     * Portanto, com o Prisma atual, não existe onde salvar
     * uma pendência financeira de venda balcão.
     *
     * Para habilitar isso corretamente, o próximo passo é criar
     * um model AccountsReceivable/Receivable.
     */
    if (method === "PAY_LATER") {
      if (!dueDate) {
        return NextResponse.json(
          { error: "Informe a data de vencimento para pagamento posterior." },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          error:
            "Pagar depois em venda avulsa ainda não está disponível. Por enquanto, use essa opção em comandas/agendamentos.",
        },
        { status: 400 },
      )
    }

    /**
     * Observação:
     * Não fazemos baixa de estoque aqui.
     *
     * Motivo:
     * O PagamentoModal já baixa o estoque depois que esse endpoint responde OK.
     * Se baixarmos aqui também, o estoque será debitado duas vezes.
     */

    const caixa = await getOuCriarCaixaHoje()

    const descricaoProdutos =
      items.length > 0
        ? items
            .map((item: any) => {
              const nome = item.nome || item.name || "Produto"
              const qty = Number(item.qty ?? item.quantity ?? 1)

              return `${nome} × ${qty}`
            })
            .join(", ")
        : "Venda balcão"

    await prisma.transaction.create({
      data: {
        cashRegisterId: caixa.id,
        type: "RECEITA",
        amount,
        description: clientId
          ? `Venda balcão · ${descricaoProdutos}`
          : `Venda balcão · ${descricaoProdutos}`,
        method,
      },
    })

    return NextResponse.json({
      ok: true,
      method,
      amount,
      caixaId: caixa.id,
      message: `Venda registrada em ${nomeMetodo(method)}.`,
    })
  } catch (error) {
    console.error("[POST /api/venda]", error)

    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    )
  }
}