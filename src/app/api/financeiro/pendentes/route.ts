import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  const ESTAB_ID = session?.user?.establishmentId
  if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999)

  // take: 300 em cada lista — circuit-breaker contra crescimento sem limite;
  // como já vem ordenado por vencimento (mais urgente primeiro), truncar
  // mantém os itens mais relevantes na resposta.
  const [pagamentos, assinaturas] = await Promise.all([
    // Pagamentos PAY_LATER pendentes
    prisma.payment.findMany({
      where: {
        status: "PENDING",
        appointment: { establishmentId: ESTAB_ID },
      },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        method: true,
        createdAt: true,
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            client: { select: { id: true, name: true, phone: true } },
            service: { select: { name: true, price: true } },
            professional: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 300,
    }),

    // Assinaturas ativas com vencimento <= hoje
    prisma.subscription.findMany({
      where: {
        status: { in: ["ACTIVE", "OVERDUE"] as any },
        nextBillingAt: { lte: hoje },
        client: { establishmentId: ESTAB_ID },
      },
      select: {
        id: true,
        price: true,
        nextBillingAt: true,
        status: true,
        client: { select: { id: true, name: true, phone: true } },
        plan: { select: { name: true } },
      },
      orderBy: { nextBillingAt: "asc" },
      take: 300,
    }),
  ])

  // Atualiza para OVERDUE qualquer assinatura ACTIVE que já venceu
  const idsParaAtualizar = assinaturas.filter((s) => s.status === "ACTIVE").map((s) => s.id)
  if (idsParaAtualizar.length > 0) {
    await prisma.subscription.updateMany({
      where: { id: { in: idsParaAtualizar } },
      data: { status: "OVERDUE" as any },
    })
  }

  const itens = [
    ...pagamentos.map((p) => ({
      id: p.id,
      tipo: "payment" as const,
      appointmentId: p.appointment.id,
      method: p.method ?? "PAY_LATER",
      amount: p.amount,
      dueDate: p.dueDate,
      createdAt: p.createdAt,
      scheduledAt: p.appointment.scheduledAt,
      client: p.appointment.client,
      service: p.appointment.service,
      professional: p.appointment.professional,
    })),

    ...assinaturas.map((s) => ({
      id: s.id,
      tipo: "subscription" as const,
      appointmentId: "",
      method: "SUBSCRIPTION",
      amount: s.price,
      dueDate: s.nextBillingAt,
      createdAt: s.nextBillingAt,
      scheduledAt: s.nextBillingAt,
      client: s.client,
      service: { name: `Assinatura · ${s.plan.name}`, price: s.price },
      professional: { name: "" },
    })),
  ]

  // Ordena tudo por vencimento (nulos por último)
  itens.sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate as any).getTime() - new Date(b.dueDate as any).getTime()
  })

  return NextResponse.json(itens)
}
