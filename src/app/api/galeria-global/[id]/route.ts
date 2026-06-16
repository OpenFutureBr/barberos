import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const corte = await prisma.galeriaCorte.update({
      where: { id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        description: body.description !== undefined ? (body.description || null) : undefined,
        category: body.category !== undefined ? (body.category || null) : undefined,
        instagramUrl: body.instagramUrl !== undefined ? (body.instagramUrl || null) : undefined,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
        difficulty: body.difficulty !== undefined ? (body.difficulty || null) : undefined,
        durationMin: body.durationMin !== undefined ? (body.durationMin ? parseInt(body.durationMin) : null) : undefined,
        instructions: body.instructions !== undefined ? (body.instructions || null) : undefined,
        sortOrder: body.sortOrder !== undefined ? parseInt(body.sortOrder) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    })
    return NextResponse.json(corte)
  } catch (error) {
    console.error("[PUT /api/galeria-global/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const { id } = await params
    await prisma.galeriaCorte.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[DELETE /api/galeria-global/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
