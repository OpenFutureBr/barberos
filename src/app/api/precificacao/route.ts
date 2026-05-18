import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const regras = await prisma.pricingRule.findMany({
      where: { establishmentId: "estab001" },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json(regras)
  } catch (error) {
    console.error("[GET /api/precificacao]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const regra = await prisma.pricingRule.create({
      data: {
        name: String(body.name),
        description: body.description || null,
        isActive: body.isActive !== false,
        markupPct: parseFloat(body.markupPct) || 0,
        discountPct: parseFloat(body.discountPct) || 0,
        daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : [],
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        establishmentId: "estab001",
      },
    })
    return NextResponse.json(regra)
  } catch (error) {
    console.error("[POST /api/precificacao]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
