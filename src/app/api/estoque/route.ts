import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { temPermissao, bloqueioSemPermissao } from "@/lib/permissoes"


function float(v: unknown): number {
  const n = parseFloat(String(v))
  if (isNaN(n)) throw new Error(`Valor numérico inválido: "${v}"`)
  return n
}

function int(v: unknown, fallback = 0): number {
  if (v === undefined || v === null || v === "") return fallback
  const n = parseInt(String(v), 10)
  return isNaN(n) ? fallback : n
}

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    // Também usado pelo picker de produtos da comanda (Agenda) — libera se
    // tiver "estoque" (gestão) ou só "agenda" (fechar comanda com produto).
    if (!temPermissao(session?.user, "estoque") && !temPermissao(session?.user, "agenda")) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    const produtos = await prisma.product.findMany({
      where: { establishmentId: estabId },
      include: {
        stockMovements: {
          select: { type: true, quantity: true, unitPrice: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(produtos)
  } catch (error) {
    console.error("[GET /api/estoque]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "estoque")
    if (bloqueio) return bloqueio

    const body = await request.json()
    console.log("[POST /api/estoque] body:", body)

    const costPrice = float(body.costPrice)
    const salePrice = float(body.salePrice)
    const stock = int(body.stock, 0)
    const minStock = int(body.minStock, 5)

    const produto = await prisma.product.create({
      data: {
        name: String(body.name),
        barcode: body.barcode ? String(body.barcode) : null,
        costPrice,
        salePrice,
        stock,
        minStock,
        category: body.category ? String(body.category) : null,
        subCategory: body.subCategory ? String(body.subCategory) : null,
        hasAlcohol: Boolean(body.hasAlcohol),
        photoUrl: body.photoUrl ? String(body.photoUrl) : null,
        isActive: true,
        establishmentId: estabId,
      },
    })

    if (stock > 0) {
      await prisma.stockMovement.create({
        data: { productId: produto.id, type: "ENTRADA", quantity: stock, reason: "Estoque inicial" },
      })
    }

    return NextResponse.json(produto)
  } catch (error) {
    console.error("[POST /api/estoque]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "estoque")
    if (bloqueio) return bloqueio

    const body = await request.json()
    console.log("[PUT /api/estoque] body:", body)

    const alvo = await prisma.product.findFirst({ where: { id: String(body.id), establishmentId: estabId }, select: { id: true } })
    if (!alvo) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.barcode !== undefined) data.barcode = body.barcode ? String(body.barcode) : null
    if (body.costPrice !== undefined) data.costPrice = float(body.costPrice)
    if (body.salePrice !== undefined) data.salePrice = float(body.salePrice)
    if (body.stock !== undefined) data.stock = int(body.stock)
    if (body.minStock !== undefined) data.minStock = int(body.minStock, 5)
    if (body.category !== undefined) data.category = body.category ? String(body.category) : null
    if (body.subCategory !== undefined) data.subCategory = body.subCategory ? String(body.subCategory) : null
    if (body.hasAlcohol !== undefined) data.hasAlcohol = Boolean(body.hasAlcohol)
    if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl ? String(body.photoUrl) : null
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

    const produto = await prisma.product.update({ where: { id: String(body.id) }, data })
    return NextResponse.json(produto)
  } catch (error) {
    console.error("[PUT /api/estoque]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
