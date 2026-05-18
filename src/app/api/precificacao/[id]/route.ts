import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.description !== undefined) data.description = body.description || null
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (body.markupPct !== undefined) data.markupPct = parseFloat(body.markupPct) || 0
    if (body.discountPct !== undefined) data.discountPct = parseFloat(body.discountPct) || 0
    if (body.daysOfWeek !== undefined) data.daysOfWeek = Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : []
    if (body.startTime !== undefined) data.startTime = body.startTime || null
    if (body.endTime !== undefined) data.endTime = body.endTime || null
    const regra = await prisma.pricingRule.update({ where: { id }, data })
    return NextResponse.json(regra)
  } catch (error) {
    console.error("[PUT /api/precificacao/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.pricingRule.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[DELETE /api/precificacao/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
