import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "assinaturas")
    if (bloqueio) return bloqueio

    const planos = await prisma.subscriptionPlan.findMany({
      where: { establishmentId: estabId },
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
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "assinaturas")
    if (bloqueio) return bloqueio

    const body = await request.json()
    const plano = await prisma.subscriptionPlan.create({
      data: {
        name: String(body.name),
        description: body.description || null,
        price: parseFloat(body.price),
        cortesIncluidos: parseInt(body.cortesIncluidos) || 4,
        atendedomicilio: Boolean(body.atendedomicilio),
        services: Array.isArray(body.services) ? body.services : [],
        establishmentId: estabId,
      },
    })
    return NextResponse.json(plano)
  } catch (error) {
    console.error("[POST /api/assinaturas/planos]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
