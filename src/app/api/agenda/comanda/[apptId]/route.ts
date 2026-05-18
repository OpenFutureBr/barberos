import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"





export async function GET(_: Request, { params }: { params: Promise<{ apptId: string }> }) {
  try {
    const { apptId } = await params
    const [appt, movimentos] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: apptId },
        include: {
          client: { select: { name: true, phone: true } },
          service: { select: { name: true, price: true, durationMin: true } },
          professional: { select: { name: true } },
        },
      }),
      prisma.stockMovement.findMany({
        where: { appointmentId: apptId, type: "SAIDA" },
        include: { product: { select: { name: true, salePrice: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ])
    if (!appt) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
    return NextResponse.json({ appt, movimentos })
  } catch (error) {
    console.error("[GET /api/agenda/comanda]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(_: Request, { params }: { params: Promise<{ apptId: string }> }) {
  try {
    const { apptId } = await params
    await prisma.appointment.update({
      where: { id: apptId },
      data: { status: "DONE" },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[PUT /api/agenda/comanda]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
