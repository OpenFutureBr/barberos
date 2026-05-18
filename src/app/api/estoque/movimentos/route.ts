import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"





export async function GET() {
  try {
    const movimentos = await prisma.stockMovement.findMany({
      include: { product: { select: { name: true, category: true, salePrice: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
    return NextResponse.json(movimentos)
  } catch (error) {
    console.error("[GET /movimentos]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const qty = Math.abs(parseInt(String(body.quantity), 10))
    if (isNaN(qty) || qty <= 0) return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 })

    const unitPrice = body.unitPrice != null ? parseFloat(String(body.unitPrice)) : null

    await prisma.stockMovement.create({
      data: {
        productId: body.productId,
        type: body.type,
        quantity: qty,
        reason: body.reason || null,
        unitPrice: unitPrice ?? undefined,
        appointmentId: body.appointmentId || null,
      },
    })

    if (body.type === "ENTRADA") {
      await prisma.product.update({
        where: { id: body.productId },
        data: {
          stock: { increment: qty },
          ...(body.costPrice ? { costPrice: parseFloat(String(body.costPrice)) } : {}),
        },
      })
    } else {
      const produto = await prisma.product.findUnique({ where: { id: body.productId } })
      if (!produto || produto.stock < qty)
        return NextResponse.json({ error: "Estoque insuficiente" }, { status: 400 })

      await prisma.product.update({
        where: { id: body.productId },
        data: { stock: { decrement: qty } },
      })

      const price = unitPrice ?? produto.salePrice
      await prisma.productSale.create({
        data: { productId: body.productId, quantity: qty, unitPrice: price, total: price * qty },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[POST /movimentos]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
