import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const planos = await prisma.subscriptionPlan.findMany({
      where: { establishmentId: "estab001" },
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "OVERDUE"] as any } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json(planos)
  } catch (error) {
    console.error("[GET /api/assinaturas/planos]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const plano = await prisma.subscriptionPlan.create({
      data: {
        name: String(body.name),
        description: body.description || null,
        price: parseFloat(body.price),
        cortesIncluidos: parseInt(body.cortesIncluidos) || 4,
        atendedomicilio: Boolean(body.atendedomicilio),
        services: Array.isArray(body.services) ? body.services : [],
        establishmentId: "estab001",
      },
    })
    return NextResponse.json(plano)
  } catch (error) {
    console.error("[POST /api/assinaturas/planos]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
