import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const assinantes = await prisma.subscription.findMany({
      where: {
        plan: { establishmentId: "estab001" },
        status: { not: "CANCELLED" as any },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        plan: { select: { id: true, name: true, price: true, cortesIncluidos: true, atendedomicilio: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(assinantes)
  } catch (error) {
    console.error("[GET /api/assinaturas/assinantes]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clientId, planId, startedAt } = body

    // Verifica se cliente já tem assinatura ativa
    const existente = await prisma.subscription.findUnique({ where: { clientId } })
    if (existente && existente.status !== "CANCELLED") {
      return NextResponse.json({ error: "Cliente já possui uma assinatura ativa" }, { status: 400 })
    }

    const plano = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plano) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })

    const inicio = startedAt ? new Date(startedAt) : new Date()
    const proximaRenovacao = new Date(inicio)
    proximaRenovacao.setMonth(proximaRenovacao.getMonth() + 1)

    const assinatura = await prisma.subscription.upsert({
      where: { clientId },
      create: {
        clientId,
        planId,
        price: plano.price,
        startedAt: inicio,
        nextBillingAt: proximaRenovacao,
        status: "ACTIVE",
      },
      update: {
        planId,
        price: plano.price,
        startedAt: inicio,
        nextBillingAt: proximaRenovacao,
        status: "ACTIVE",
        cancelledAt: null,
        pausedAt: null,
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        plan: { select: { id: true, name: true, price: true, cortesIncluidos: true } },
      },
    })

    return NextResponse.json(assinatura)
  } catch (error) {
    console.error("[POST /api/assinaturas/assinantes]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
