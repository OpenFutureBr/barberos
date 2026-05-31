import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const ESTAB = "estab001"

async function getCaixaHoje() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

  return prisma.cashRegister.findFirst({
    where: {
      establishmentId: ESTAB,
      openedAt: {
        gte: inicio,
        lte: fim,
      },
    },
    include: {
      transactions: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      openedAt: "desc",
    },
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Modo resumo: só retorna status + saldo (usado pelo dashboard)
    if (searchParams.get("resumo") === "true") {
      const hoje = new Date()
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

      const caixa = await prisma.cashRegister.findFirst({
        where: { establishmentId: ESTAB, openedAt: { gte: inicio, lte: fim } },
        select: { id: true, closedAt: true },
        orderBy: { openedAt: "desc" },
      })

      const agg = await prisma.transaction.aggregate({
        where: { cashRegister: { establishmentId: ESTAB, openedAt: { gte: inicio, lte: fim } } },
        _sum: { amount: true },
      })

      return NextResponse.json({
        aberto: caixa ? !caixa.closedAt : false,
        saldo: agg._sum.amount ?? 0,
        caixa: caixa ? { id: caixa.id, closedAt: caixa.closedAt } : null,
        lancamentos: [],
      })
    }

    const caixa = await getCaixaHoje()

    const hoje = new Date()
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

    /**
     * Pagamentos confirmados hoje.
     *
     * Regra:
     * - Só entra no caixa se status = PAID
     * - Não entra se tiver dueDate, porque pagamento "Pagar depois"
     *   será lançado no caixa via Transaction quando for quitado no Financeiro.
     *
     * Isso evita:
     * - pendente entrar no caixa antes de receber
     * - duplicidade quando uma pendência é marcada como paga
     */
    const pagamentos = await prisma.payment.findMany({
      where: {
        status: "PAID",
        dueDate: null,
        createdAt: {
          gte: inicio,
          lte: fim,
        },
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
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    /**
     * Todos os pagamentos vinculados aos movimentos de hoje.
     * Usado para saber se um movimento de produto pertence a uma comanda
     * que já tem pagamento/pendência vinculada.
     *
     * Assim o produto da comanda não aparece como venda avulsa indevida.
     */
    const pagamentosDeAgendamentos = await prisma.payment.findMany({
      where: {
        appointment: {
          establishmentId: ESTAB,
        },
      },
      select: {
        appointmentId: true,
        status: true,
        dueDate: true,
      },
    })

    const appointmentIdsComQualquerPagamento = new Set(
      pagamentosDeAgendamentos.map((p) => p.appointmentId),
    )

    // Todos os movimentos SAIDA com unitPrice hoje
    const movimentos = await prisma.stockMovement.findMany({
      where: {
        createdAt: {
          gte: inicio,
          lte: fim,
        },
        type: "SAIDA",
        unitPrice: {
          not: null,
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Agrupa produtos por appointmentId apenas para pagamentos imediatos exibidos no caixa
    const prodsPorAppt: Record<string, { nome: string; qty: number; valor: number }[]> = {}
    const apptIdsComPagamentoImediatoExibido = new Set(
      pagamentos.map((p) => p.appointmentId),
    )

    for (const m of movimentos) {
      if (!m.appointmentId) continue
      if (!apptIdsComPagamentoImediatoExibido.has(m.appointmentId)) continue

      if (!prodsPorAppt[m.appointmentId]) {
        prodsPorAppt[m.appointmentId] = []
      }

      prodsPorAppt[m.appointmentId].push({
        nome: m.product?.name ?? "Produto",
        qty: m.quantity,
        valor: m.quantity * (m.unitPrice ?? 0),
      })
    }

    const lancamentos: any[] = []

    // Receitas de pagamentos imediatos confirmados hoje
    for (const p of pagamentos) {
      const apptId = p.appointmentId
      const produtos = apptId ? prodsPorAppt[apptId] ?? [] : []
      const servicoNome = p.appointment?.service?.name ?? "Serviço"
      const clienteNome = p.appointment?.client?.name ?? ""
      const servicoValor = p.appointment?.service?.price ?? 0

      lancamentos.push({
        id: `pay-${p.id}`,
        tipo: "RECEITA",
        descricao: clienteNome ? `${servicoNome} — ${clienteNome}` : servicoNome,
        valor: p.amount,
        method: p.method,
        createdAt: p.createdAt,
        origem: "pagamento",
        detalhes:
          produtos.length > 0
            ? [
                {
                  label: servicoNome,
                  valor: servicoValor,
                },
                ...produtos.map((x) => ({
                  label: `${x.nome} × ${x.qty}`,
                  valor: x.valor,
                })),
              ]
            : null,
      })
    }

    /**
     * Produtos vendidos SEM agendamento vinculado a pagamento.
     *
     * Regra:
     * - se tem appointmentId e esse appointmentId tem qualquer pagamento,
     *   não mostra como produto avulso
     * - isso inclui pendências do "Pagar depois"
     */
    for (const m of movimentos) {
      if (m.appointmentId && appointmentIdsComQualquerPagamento.has(m.appointmentId)) {
        continue
      }

      const valor = m.quantity * (m.unitPrice ?? 0)
      if (valor <= 0) continue

      lancamentos.push({
        id: `mov-${m.id}`,
        tipo: "RECEITA",
        descricao: `${m.product?.name ?? "Produto"} × ${m.quantity}`,
        valor,
        method: null,
        createdAt: m.createdAt,
        origem: "produto",
        detalhes: null,
      })
    }

    /**
     * Transações manuais:
     * - despesas
     * - sangrias
     * - receitas manuais
     * - recebimentos de pendências quitadas no Financeiro
     */
    if (caixa) {
      for (const t of caixa.transactions) {
        lancamentos.push({
          id: `tx-${t.id}`,
          tipo: t.type,
          descricao: t.description ?? "",
          valor: t.amount,
          method: t.method,
          createdAt: t.createdAt,
          origem: "manual",
          detalhes: null,
          txId: t.id,
        })
      }
    }

    lancamentos.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    return NextResponse.json({
      caixa,
      lancamentos,
    })
  } catch (error) {
    console.error("[GET /api/caixa]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === "abrir") {
      const caixa = await prisma.cashRegister.create({
        data: {
          establishmentId: ESTAB,
          openingAmount: parseFloat(body.openingAmount ?? 0),
        },
      })

      return NextResponse.json(caixa)
    }

    if (body.action === "fechar") {
      const caixa = await getCaixaHoje()

      if (!caixa) {
        return NextResponse.json({ error: "Nenhum caixa aberto" }, { status: 400 })
      }

      const updated = await prisma.cashRegister.update({
        where: {
          id: caixa.id,
        },
        data: {
          closedAt: new Date(),
          closingAmount: parseFloat(body.closingAmount ?? 0),
        },
      })

      return NextResponse.json(updated)
    }

    if (body.action === "lancar") {
      let caixa = await getCaixaHoje()

      if (!caixa) {
        caixa = await prisma.cashRegister.create({
          data: {
            establishmentId: ESTAB,
            openingAmount: 0,
          },
          include: {
            transactions: true,
          },
        })
      }

      const tx = await prisma.transaction.create({
        data: {
          cashRegisterId: caixa.id,
          type: body.tipo,
          amount: parseFloat(body.valor),
          description: body.descricao,
          method: body.metodo ?? null,
        },
      })

      return NextResponse.json(tx)
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("[POST /api/caixa]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}