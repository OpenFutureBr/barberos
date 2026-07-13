import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get("serviceId")
    const where: Record<string, unknown> = { establishmentId: estabId }
    if (serviceId) where.serviceId = serviceId
    const cortes = await prisma.haircut.findMany({
      where,
      include: { service: { select: { id: true, name: true, category: true } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(cortes)
  } catch (error) {
    console.error("[GET /api/galeria]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await request.json()
    const corte = await prisma.haircut.create({
      data: {
        name: String(body.name),
        description: body.description || null,
        photoUrl: body.photoUrl || null,
        instagramUrl: body.instagramUrl || null,
        serviceId: body.serviceId || null,
        instructions: body.instructions || null,
        durationMin: body.durationMin ? parseInt(body.durationMin) : null,
        difficulty: body.difficulty || null,
        category: body.category || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        isActive: body.isActive !== false,
        establishmentId: estabId,
      },
      include: { service: { select: { id: true, name: true, category: true } } },
    })
    return NextResponse.json(corte)
  } catch (error) {
    console.error("[POST /api/galeria]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
