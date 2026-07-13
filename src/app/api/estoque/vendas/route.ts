import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"


export async function GET(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "estoque")
    if (bloqueio) return bloqueio

    const { searchParams } = new URL(request.url)
    const data = searchParams.get("data") // YYYY-MM-DD, opcional

    const where = data ? {
      createdAt: {
        gte: new Date(`${data}T00:00:00-03:00`),
        lte: new Date(`${data}T23:59:59-03:00`),
      },
    } : {}

    // Busca os movimentos de SAIDA (que têm a info de cliente no campo reason)
    // Escopo por estabelecimento via relação com Product (multi-tenant fix).
    const vendas = await prisma.stockMovement.findMany({
      where: { ...where, type: "SAIDA", product: { establishmentId: estabId } },
      include: { product: { select: { name: true, salePrice: true, category: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    return NextResponse.json(vendas)
  } catch (error) {
    console.error("[GET /api/estoque/vendas]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
