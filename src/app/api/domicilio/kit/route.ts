import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const items = await prisma.kitItem.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await request.json()
    if (!body.name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })

    const item = await prisma.kitItem.create({
      data: {
        name: body.name.trim(),
        quantity: Math.max(0, parseInt(body.quantity) || 0),
        minQuantity: Math.max(0, parseInt(body.minQuantity) || 1),
        unit: body.unit?.trim() || "un",
        notes: body.notes?.trim() || null,
        userId,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
