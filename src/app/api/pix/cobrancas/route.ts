import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { limitesHojeBRT } from "@/lib/data-brt"

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { inicio, fim } = limitesHojeBRT()

    const appointments = await prisma.appointment.findMany({
      where: {
        establishmentId: estabId,
        scheduledAt: { gte: inicio, lte: fim },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { name: true, price: true } },
        professional: { select: { name: true } },
        payment: { select: { id: true, method: true, amount: true, createdAt: true } },
      },
      orderBy: { scheduledAt: "asc" },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error("[GET /api/pix/cobrancas]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
