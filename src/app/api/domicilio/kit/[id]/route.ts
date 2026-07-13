import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"

async function verificar(id: string, userId: string) {
  return prisma.kitItem.findFirst({ where: { id, userId }, select: { id: true } })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "domicilio")
    if (bloqueio) return bloqueio
    if (!await verificar(id, userId)) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })

    const body = await request.json()
    const item = await prisma.kitItem.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.quantity !== undefined ? { quantity: Math.max(0, parseInt(body.quantity)) } : {}),
        ...(body.minQuantity !== undefined ? { minQuantity: Math.max(0, parseInt(body.minQuantity)) } : {}),
        ...(body.unit !== undefined ? { unit: String(body.unit).trim() || "un" } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    })
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "domicilio")
    if (bloqueio) return bloqueio
    if (!await verificar(id, userId)) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })

    await prisma.kitItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
