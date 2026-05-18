import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const hoje = new Date()
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

    const appointments = await prisma.appointment.findMany({
      where: {
        establishmentId: "estab001",
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
