import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const mesAtual = new Date().toISOString().slice(0, 7) // YYYY-MM

    const assinantes = await prisma.subscription.findMany({
      where: {
        plan: { establishmentId: estabId },
        status: { not: "CANCELLED" as any },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        plan: { select: { id: true, name: true, price: true, cortesIncluidos: true, atendedomicilio: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const agora = new Date()

    // Reseta cortesUsados se mudou o mês; marca OVERDUE se venceu sem renovação.
    // Antes disparava um UPDATE por assinante (sequencial); agora agrupa os ids
    // por tipo de mudança e faz no máximo 2 updateMany em paralelo.
    const idsResetMes: string[] = []
    const idsOverdue: string[] = []

    for (const a of assinantes) {
      if (a.mesReferencia !== mesAtual) {
        idsResetMes.push(a.id)
        a.cortesUsados = 0
        a.mesReferencia = mesAtual
      }

      if (a.status === "ACTIVE" && new Date(a.nextBillingAt) <= agora) {
        idsOverdue.push(a.id)
        ;(a as any).status = "OVERDUE"
      }
    }

    await Promise.all([
      idsResetMes.length
        ? prisma.subscription.updateMany({
            where: { id: { in: idsResetMes } },
            data: { cortesUsados: 0, mesReferencia: mesAtual },
          }).catch(() => {})
        : null,
      idsOverdue.length
        ? prisma.subscription.updateMany({
            where: { id: { in: idsOverdue } },
            data: { status: "OVERDUE" },
          }).catch(() => {})
        : null,
    ])

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
