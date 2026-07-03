import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id } = await params

    const existente = await prisma.haircut.findFirst({ where: { id, establishmentId: estabId }, select: { id: true } })
    if (!existente) return NextResponse.json({ error: "Corte não encontrado" }, { status: 404 })

    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.description !== undefined) data.description = body.description || null
    if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl || null
    if (body.instagramUrl !== undefined) data.instagramUrl = body.instagramUrl || null
    if (body.serviceId !== undefined) data.serviceId = body.serviceId || null
    if (body.instructions !== undefined) data.instructions = body.instructions || null
    if (body.durationMin !== undefined) data.durationMin = body.durationMin ? parseInt(body.durationMin) : null
    if (body.difficulty !== undefined) data.difficulty = body.difficulty || null
    if (body.category !== undefined) data.category = body.category || null
    if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? body.tags : []
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

    const corte = await prisma.haircut.update({
      where: { id },
      data,
      include: { service: { select: { id: true, name: true, category: true } } },
    })
    return NextResponse.json(corte)
  } catch (error) {
    console.error("[PUT /api/galeria/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id } = await params

    const existente = await prisma.haircut.findFirst({ where: { id, establishmentId: estabId }, select: { id: true } })
    if (!existente) return NextResponse.json({ error: "Corte não encontrado" }, { status: 404 })

    await prisma.haircut.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[DELETE /api/galeria/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
