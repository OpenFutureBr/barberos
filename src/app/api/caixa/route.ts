import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const ESTAB = "estab001"

// Retorna o caixa do dia (ou null se fechado/inexistente)
async function getCaixaHoje() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)
  return prisma.cashRegister.findFirst({
    where: { establishmentId: ESTAB, openedAt: { gte: inicio, lte: fim } },
    include: { transactions: { orderBy: { createdAt: "asc" } } },
    orderBy: { openedAt: "desc" },
  })
}

export async function GET() {
  try {
    const caixa = await getCaixaHoje()

    // Pagamentos confirmados hoje (receitas automáticas)
    const hoje = new Date()
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

    const pagamentos = await prisma.payment.findMany({
      where: { createdAt: { gte: inicio, lte: fim } },
      include: {
        appointment: {
          include: {
            client: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Movimentos SAIDA (produtos vendidos) com unitPrice
    const movimentos = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: inicio, lte: fim }, type: "SAIDA", unitPrice: { not: null } },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    })

    // Monta lista unificada de lançamentos
    const lancamentos: any[] = []

    // Receitas de serviços (payments)
    for (const p of pagamentos) {
      lancamentos.push({
        id: `pay-${p.id}`,
        tipo: "RECEITA",
        descricao: p.appointment
          ? `${p.appointment.service?.name ?? "Serviço"} — ${p.appointment.client?.name ?? ""}`
          : "Pagamento",
        valor: p.amount,
        method: p.method,
        createdAt: p.createdAt,
        origem: "pagamento",
      })
    }

    // Receitas de produtos (movimentos SAIDA com valor)
    const prodsPorAppt: Record<string, { nome: string; valor: number; createdAt: Date }> = {}
    for (const m of movimentos) {
      const key = m.appointmentId ?? m.id
      if (!prodsPorAppt[key]) {
        prodsPorAppt[key] = { nome: m.product?.name ?? "Produto", valor: 0, createdAt: m.createdAt }
      }
      prodsPorAppt[key].valor += m.quantity * (m.unitPrice ?? 0)
    }
    for (const [, v] of Object.entries(prodsPorAppt)) {
      if (v.valor > 0) {
        lancamentos.push({
          id: `mov-${v.createdAt.getTime()}`,
          tipo: "RECEITA",
          descricao: `Produto: ${v.nome}`,
          valor: v.valor,
          method: null,
          createdAt: v.createdAt,
          origem: "produto",
        })
      }
    }

    // Transações manuais do caixa (despesas, sangrias, receitas manuais)
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
          txId: t.id,
        })
      }
    }

    lancamentos.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    return NextResponse.json({ caixa, lancamentos })
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
      if (!caixa) return NextResponse.json({ error: "Nenhum caixa aberto" }, { status: 400 })
      const updated = await prisma.cashRegister.update({
        where: { id: caixa.id },
        data: { closedAt: new Date(), closingAmount: parseFloat(body.closingAmount ?? 0) },
      })
      return NextResponse.json(updated)
    }

    if (body.action === "lancar") {
      let caixa = await getCaixaHoje()
      if (!caixa) {
        // Abre o caixa automaticamente se não existir
        caixa = await prisma.cashRegister.create({
          data: { establishmentId: ESTAB, openingAmount: 0 },
          include: { transactions: true },
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
