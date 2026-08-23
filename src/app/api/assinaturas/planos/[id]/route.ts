import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "assinaturas")
    if (bloqueio) return bloqueio

    const { id } = await params

    const existente = await prisma.subscriptionPlan.findFirst({ where: { id, establishmentId: estabId }, select: { id: true } })
    if (!existente) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })

    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.description !== undefined) data.description = body.description || null
    if (body.price !== undefined) data.price = parseFloat(body.price)
    if (body.cortesIncluidos !== undefined) data.cortesIncluidos = parseInt(body.cortesIncluidos) || 4
    if (body.atendedomicilio !== undefined) data.atendedomicilio = Boolean(body.atendedomicilio)
    if (body.services !== undefined) data.services = Array.isArray(body.services) ? body.services : []
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    const plano = await prisma.subscriptionPlan.update({ where: { id }, data })
    return NextResponse.json(plano)
  } catch (error) {
    console.error("[PUT /api/assinaturas/planos/[id]]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "assinaturas")
    if (bloqueio) return bloqueio

    const { id } = await params

    const existente = await prisma.subscriptionPlan.findFirst({ where: { id, establishmentId: estabId }, select: { id: true } })
    if (!existente) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })

    await prisma.subscriptionPlan.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[DELETE /api/assinaturas/planos/[id]]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
