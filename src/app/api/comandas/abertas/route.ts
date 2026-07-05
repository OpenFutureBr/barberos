import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Retorna agendamentos de hoje com status ativo (comanda potencialmente aberta)
// Uma comanda não deve ficar mais de 24h aberta
export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const limite24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const appts = await prisma.appointment.findMany({
      where: {
        establishmentId: estabId,
        status: { in: ["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"] as any },
        scheduledAt: {
          gte: limite24h,   // não mais de 24h
          lte: new Date(),  // até agora
        },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { name: true, price: true } },
        professional: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    })

    // Para cada appointment, busca produtos já lançados na comanda (SAIDA com appointmentId)
    const apptIds = appts.map(a => a.id)
    const movimentos = apptIds.length > 0 ? await prisma.stockMovement.findMany({
      where: { appointmentId: { in: apptIds }, type: "SAIDA" },
      select: {
        appointmentId: true,
        quantity: true,
        unitPrice: true,
        product: { select: { name: true } },
      },
    }) : []

    const movPorAppt: Record<string, any[]> = {}
    for (const m of movimentos) {
      if (!m.appointmentId) continue
      if (!movPorAppt[m.appointmentId]) movPorAppt[m.appointmentId] = []
      movPorAppt[m.appointmentId].push(m)
    }

    const comandas = appts.map(a => ({
      ...a,
      produtos: movPorAppt[a.id] ?? [],
      vencida: new Date(a.scheduledAt) < limite24h,
    }))

    return NextResponse.json(comandas)
  } catch (error) {
    console.error("[GET /api/comandas/abertas]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
