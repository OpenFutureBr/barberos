import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { appointmentId, method, amount } = body

    const payment = await prisma.payment.create({
      data: {
        method: method as any,
        amount: parseFloat(amount),
        pixStatus: method === "PIX" ? "PAID" : "PAID",
        splitType: "SPLIT_ESTABLISHMENT",
        appointmentId,
      },
    })

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "DONE" as any, finishedAt: new Date() },
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error("[POST /api/pix/pagar]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
