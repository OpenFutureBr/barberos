import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"





export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get("data") // YYYY-MM-DD, opcional

    const where = data ? {
      createdAt: {
        gte: new Date(`${data}T00:00:00-03:00`),
        lte: new Date(`${data}T23:59:59-03:00`),
      },
    } : {}

    // Busca os movimentos de SAIDA (que têm a info de cliente no campo reason)
    const vendas = await prisma.stockMovement.findMany({
      where: { ...where, type: "SAIDA" },
      include: { product: { select: { name: true, salePrice: true, category: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    return NextResponse.json(vendas)
  } catch (error) {
    console.error("[GET /api/estoque/vendas]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
