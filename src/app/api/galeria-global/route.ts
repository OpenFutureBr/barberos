import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const cortes = await prisma.galeriaCorte.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    })
    return NextResponse.json(cortes)
  } catch (error) {
    console.error("[GET /api/galeria-global]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const body = await request.json()
    const corte = await prisma.galeriaCorte.create({
      data: {
        name: String(body.name).trim(),
        description: body.description || null,
        category: body.category || null,
        instagramUrl: body.instagramUrl || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        difficulty: body.difficulty || null,
        durationMin: body.durationMin ? parseInt(body.durationMin) : null,
        instructions: body.instructions || null,
        sortOrder: body.sortOrder ? parseInt(body.sortOrder) : 0,
        isActive: body.isActive !== false,
      },
    })
    return NextResponse.json(corte)
  } catch (error) {
    console.error("[POST /api/galeria-global]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
