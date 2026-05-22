import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// Endpoint para vendas avulsas (sem agendamento)
// Chamado pelo PagamentoModal via endpointOverride

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { method, amount, clientId, items } = body

    // Baixa estoque de cada produto
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: "SAIDA",
            quantity: item.qty,
            unitPrice: item.unitPrice,
            reason: clientId ? `Venda balcão` : "Venda balcão",
          },
        })
        // Atualiza estoque do produto
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        })
      }
    }

    // Registra como receita no caixa do dia
    const hoje = new Date()
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

    let caixa = await prisma.cashRegister.findFirst({
      where: { establishmentId: "estab001", openedAt: { gte: inicioDia, lte: fimDia } },
      orderBy: { openedAt: "desc" },
    })

    if (!caixa) {
      caixa = await prisma.cashRegister.create({
        data: { establishmentId: "estab001", openingAmount: 0 },
      })
    }

    const nomeMetodo = method === "PIX" ? "PIX" : method === "CASH" ? "Dinheiro" : "Cartão"
    await prisma.transaction.create({
      data: {
        cashRegisterId: caixa.id,
        type: "RECEITA",
        amount: parseFloat(amount),
        description: `Venda balcão · ${nomeMetodo}`,
        method,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[POST /api/venda]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
