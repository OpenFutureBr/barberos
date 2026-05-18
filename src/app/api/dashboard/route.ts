import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    const hoje = new Date()
    const fromDate = fromParam
      ? new Date(fromParam + "T00:00:00")
      : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
    const toDate = toParam
      ? new Date(toParam + "T23:59:59")
      : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

    const estabId = "estab001"

    const [appointments, movements] = await Promise.all([
      prisma.appointment.findMany({
        where: { establishmentId: estabId, scheduledAt: { gte: fromDate, lte: toDate } },
        include: { service: { select: { price: true } }, payment: { select: { amount: true } } },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate }, type: "SAIDA" },
        select: { quantity: true, unitPrice: true },
      }),
    ])

    const doneAppts = appointments.filter(a => a.status === "DONE")
    const pendentes = appointments.filter(a =>
      ["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"].includes(a.status as string)
    ).length

    const serviceRevenue = doneAppts.reduce((s, a) => s + (a.payment?.amount ?? a.service.price), 0)
    const productRevenue = movements.reduce((s, m) => s + m.quantity * (m.unitPrice ?? 0), 0)
    const faturamento = serviceRevenue + productRevenue
    const atendimentos = doneAppts.length
    const ticketMedio = atendimentos > 0 ? faturamento / atendimentos : 0

    const clientesVip = await prisma.client.count({
      where: { establishmentId: estabId, segment: "VIP" as any },
    })

    const now = new Date()
    const mesAtualStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const mesAtualEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const mesAnteriorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const mesAnteriorEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [apptsMesAtual, apptsMesAnterior] = await Promise.all([
      prisma.appointment.findMany({
        where: { establishmentId: estabId, status: "DONE" as any, scheduledAt: { gte: mesAtualStart, lte: mesAtualEnd } },
        select: { clientId: true },
      }),
      prisma.appointment.findMany({
        where: { establishmentId: estabId, status: "DONE" as any, scheduledAt: { gte: mesAnteriorStart, lte: mesAnteriorEnd } },
        select: { clientId: true },
      }),
    ])

    const mesAtualClientes = new Set(apptsMesAtual.map(a => a.clientId)).size
    const mesAnteriorClientes = new Set(apptsMesAnterior.map(a => a.clientId)).size

    return NextResponse.json({ faturamento, atendimentos, ticketMedio, clientesVip, pendentes, mesAtualClientes, mesAnteriorClientes })
  } catch (error) {
    console.error("[GET /api/dashboard]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
