import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { temPermissao } from "@/lib/permissoes"


export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (!temPermissao(session?.user, "estoque") && !temPermissao(session?.user, "agenda")) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    // Escopo por estabelecimento — StockMovement não tem establishmentId direto,
    // então filtramos pela relação com Product (multi-tenant fix).
    const movimentos = await prisma.stockMovement.findMany({
      where: { product: { establishmentId: estabId } },
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
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (!temPermissao(session?.user, "estoque") && !temPermissao(session?.user, "agenda")) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    const body = await request.json()
    const qty = Math.abs(parseInt(String(body.quantity), 10))
    if (isNaN(qty) || qty <= 0) return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 })

    // Confere que o produto é do mesmo estabelecimento da sessão — antes essa
    // rota não verificava nada, permitindo mexer no estoque de outra unidade
    // bastando saber o productId.
    const produtoDoEstab = await prisma.product.findFirst({ where: { id: body.productId, establishmentId: estabId }, select: { id: true } })
    if (!produtoDoEstab) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

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
