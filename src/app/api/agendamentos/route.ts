import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get("data")

    const where: any = { establishmentId: "estab001" }

   if (data) {
      const inicio = new Date(`${data}T00:00:00-03:00`)
      const fim = new Date(`${data}T23:59:59-03:00`)
      where.scheduledAt = { gte: inicio, lte: fim }
    }

    const agendamentos = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
      },
      orderBy: { scheduledAt: "asc" },
    })
    return NextResponse.json(agendamentos)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const agendamento = await prisma.appointment.create({
      data: {
        clientId: body.clientId,
        professionalId: body.professionalId,
        serviceId: body.serviceId,
        scheduledAt: new Date(body.scheduledAt),
        serviceType: body.serviceType || "PRESENTIAL",
        status: "SCHEDULED",
        establishmentId: "estab001",
        notes: body.notes || null,
      },
      include: {
        client: { select: { id: true, name: true } },
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
      },
    })
    return NextResponse.json(agendamento)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const agendamento = await prisma.appointment.update({
      where: { id: body.id },
      data: { status: body.status },
    })
    return NextResponse.json(agendamento)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}