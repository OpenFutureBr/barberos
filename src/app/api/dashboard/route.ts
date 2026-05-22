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
        include: {
          service: { select: { name: true, price: true } },
          payment: { select: { amount: true } },
        },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate }, type: "SAIDA" },
        select: { quantity: true, unitPrice: true, product: { select: { name: true } } },
      }),
    ])

    const doneAppts = appointments.filter(a => a.status === "DONE")
    const pendentes = appointments.filter(a =>
      ["SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS"].includes(a.status as string)
    ).length
    const cancelados = appointments.filter(a =>
      ["CANCELLED", "NO_SHOW"].includes(a.status as string)
    ).length

    // Split presencial vs domicílio
    const donePresencial = doneAppts.filter(a => a.serviceType !== "HOME_VISIT")
    const donedomicilio = doneAppts.filter(a => a.serviceType === "HOME_VISIT")
    const movPresencial = movements // todos sem appointmentId são PDV (sem tipo)
    const receitaPresencial = donePresencial.reduce((s, a) => s + a.service.price, 0)
    const receitadomicilio = donedomicilio.reduce((s, a) => s + a.service.price, 0)

    const serviceRevenue = doneAppts.reduce((s, a) => s + (a.payment?.amount ?? a.service.price), 0)
    const productRevenue = movements.reduce((s, m) => s + m.quantity * (m.unitPrice ?? 0), 0)
    const faturamento = serviceRevenue + productRevenue
    const atendimentos = doneAppts.length
    const ticketMedio = atendimentos > 0 ? faturamento / atendimentos : 0

    // Top serviços
    const svcMap: Record<string, { nome: string; count: number; receita: number }> = {}
    for (const a of doneAppts) {
      const nome = a.service.name
      if (!svcMap[nome]) svcMap[nome] = { nome, count: 0, receita: 0 }
      svcMap[nome].count++
      svcMap[nome].receita += a.service.price
    }
    const topServicos = Object.values(svcMap).sort((a, b) => b.count - a.count).slice(0, 5)

    // Top produtos
    const prodMap: Record<string, { nome: string; qtd: number; receita: number }> = {}
    for (const m of movements) {
      if (!m.product?.name) continue
      const nome = m.product.name
      if (!prodMap[nome]) prodMap[nome] = { nome, qtd: 0, receita: 0 }
      prodMap[nome].qtd += m.quantity
      prodMap[nome].receita += m.quantity * (m.unitPrice ?? 0)
    }
    const topProdutos = Object.values(prodMap).sort((a, b) => b.qtd - a.qtd).slice(0, 5)

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

    return NextResponse.json({
      faturamento, atendimentos, ticketMedio, clientesVip,
      pendentes, cancelados, mesAtualClientes, mesAnteriorClientes,
      topServicos, topProdutos,
      split: {
        presencial: { atendimentos: donePresencial.length, receita: Math.round(receitaPresencial * 100) / 100 },
        domicilio: { atendimentos: donedomicilio.length, receita: Math.round(receitadomicilio * 100) / 100 },
      },
    })
  } catch (error) {
    console.error("[GET /api/dashboard]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
