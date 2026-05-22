import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()))
    const mes = parseInt(searchParams.get("mes") ?? String(new Date().getMonth() + 1))

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 0, 23, 59, 59)
    const estabId = "estab001"

    const [appointments, movements] = await Promise.all([
      prisma.appointment.findMany({
        where: { establishmentId: estabId, status: "DONE" as any, scheduledAt: { gte: inicio, lte: fim } },
        include: {
          service: { select: { price: true } },
          payment: { select: { amount: true } },
          professional: {
            select: { id: true, name: true, employmentType: true, commissionPct: true, benchFee: true, benchFeePct: true },
          },
        },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: inicio, lte: fim }, type: "SAIDA" },
        select: { quantity: true, unitPrice: true },
      }),
    ])

    const receitaServicos = appointments.reduce((s, a) => s + a.service.price, 0)
    const receitaProdutos = movements.reduce((s, m) => s + m.quantity * (m.unitPrice ?? 0), 0)
    // Split presencial vs domicílio
    const presencial = appointments.filter(a => a.serviceType !== "HOME_VISIT")
    const domicilio = appointments.filter(a => a.serviceType === "HOME_VISIT")
    const receitaPresencial = presencial.reduce((s, a) => s + a.service.price, 0)
    const receitadomicilio = domicilio.reduce((s, a) => s + a.service.price, 0)

    // Repasses por profissional
    const repMap: Record<string, any> = {}
    for (const appt of appointments) {
      const prof = appt.professional
      if (!repMap[prof.id]) {
        repMap[prof.id] = {
          profissionalId: prof.id,
          nome: prof.name,
          tipo: prof.employmentType as string,
          commissionPct: prof.commissionPct,
          benchFee: prof.benchFee,
          benchFeePct: prof.benchFeePct,
          atendimentos: 0,
          bruto: 0,
        }
      }
      repMap[prof.id].atendimentos++
      repMap[prof.id].bruto += appt.service.price
    }

    const repasses = Object.values(repMap).map((p: any) => {
      let repasse = 0
      if (p.commissionPct) repasse = p.bruto * p.commissionPct / 100
      else if (p.benchFeePct) repasse = p.bruto * (1 - p.benchFeePct / 100)
      return { ...p, repasse: Math.round(repasse * 100) / 100, bruto: Math.round(p.bruto * 100) / 100 }
    })

    // Evolução anual — uma única query
    const anoInicio = new Date(ano, 0, 1)
    const anoFim = new Date(ano, 11, 31, 23, 59, 59)
    const [anoAppts, anoMovs] = await Promise.all([
      prisma.appointment.findMany({
        where: { establishmentId: estabId, status: "DONE" as any, scheduledAt: { gte: anoInicio, lte: anoFim } },
        include: { service: { select: { price: true } }, payment: { select: { amount: true } } },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: anoInicio, lte: anoFim }, type: "SAIDA" },
        select: { quantity: true, unitPrice: true, createdAt: true },
      }),
    ])

    const evolucao = MESES_LABEL.map((label, i) => {
      const appts = anoAppts.filter(a => new Date(a.scheduledAt).getMonth() === i)
      const movs = anoMovs.filter(m => new Date(m.createdAt).getMonth() === i)
      const valor =
        appts.reduce((s, a) => s + (a.payment?.amount ?? a.service.price), 0) +
        movs.reduce((s, m) => s + m.quantity * (m.unitPrice ?? 0), 0)
      return { mes: i + 1, label, valor: Math.round(valor * 100) / 100 }
    })

    return NextResponse.json({
      dre: {
        receitaServicos: Math.round(receitaServicos * 100) / 100,
        receitaProdutos: Math.round(receitaProdutos * 100) / 100,
        totalReceitas: Math.round((receitaServicos + receitaProdutos) * 100) / 100,
        presencial: { atendimentos: presencial.length, receita: Math.round(receitaPresencial * 100) / 100 },
        domicilio: { atendimentos: domicilio.length, receita: Math.round(receitadomicilio * 100) / 100 },
      },
      repasses,
      evolucao,
    })
  } catch (error) {
    console.error("[GET /api/financeiro]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
