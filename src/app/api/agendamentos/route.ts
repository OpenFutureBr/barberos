import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { addMinutes, isBefore, addDays } from "date-fns"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * ✅ GET - Carrega agenda
 * Backend trabalha 100% em UTC
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get("data")

    const where: any = {
      establishmentId: "estab001",
    }

    if (data) {
      const inicio = new Date(`${data}T00:00:00.000Z`)
      const fim = new Date(`${data}T23:59:59.999Z`)

      where.scheduledAt = {
        gte: inicio,
        lte: fim,
      }
    }

    const agendamentos = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true } },
        service: {
          select: { id: true, name: true, price: true, durationMin: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
    })

    return NextResponse.json(agendamentos)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

/**
 * ✅ Função defensiva de parsing
 * Corrige frontend que envia data SEM timezone
 */
function parseScheduledAt(value: string): Date {
  // Se já vier com timezone explícito, confia
  if (value.endsWith("Z") || value.includes("+") || value.includes("-")) {
    return new Date(value)
  }

  // Caso venha sem timezone (ex: 2026-04-29T10:00)
  // Interpretamos como GMT-3 e convertemos para UTC
  const local = new Date(value)
  return new Date(local.getTime() + 3 * 60 * 60 * 1000)
}

/**
 * ✅ POST - Cria agendamento
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      clientId,
      professionalId,
      serviceId,
      scheduledAt,
      serviceType,
      notes,
    } = body

    if (!clientId || !professionalId || !serviceId || !scheduledAt) {
      return NextResponse.json(
        { error: "Dados obrigatórios não informados" },
        { status: 400 }
      )
    }

    // ✅ parsing correto
    const startUtc = parseScheduledAt(scheduledAt)
    startUtc.setSeconds(0, 0)

    const endUtc = addMinutes(startUtc, 30)

    const nowUtc = new Date()
    const maxUtc = addDays(nowUtc, 5)

    // ⛔ passado
    if (isBefore(startUtc, nowUtc)) {
      return NextResponse.json(
        { error: "Não é permitido agendar no passado" },
        { status: 400 }
      )
    }

    // ⛔ mais de 5 dias
    if (isBefore(maxUtc, startUtc)) {
      return NextResponse.json(
        { error: "Agendamentos permitidos apenas até 5 dias no futuro" },
        { status: 400 }
      )
    }

    // 🚫 conflito de agenda (30 minutos)
    const conflito = await prisma.appointment.findFirst({
      where: {
        professionalId,
        establishmentId: "estab001",
        status: {
          notIn: ["CANCELLED", "NO_SHOW"],
        },
        scheduledAt: {
          gte: addMinutes(startUtc, -29),
          lt: endUtc,
        },
      },
    })

    if (conflito) {
      return NextResponse.json(
        { error: "Profissional já possui agendamento nesse horário" },
        { status: 409 }
      )
    }

    // ✅ cria agendamento
    const agendamento = await prisma.appointment.create({
      data: {
        clientId,
        professionalId,
        serviceId,
        scheduledAt: startUtc,
        serviceType: serviceType || "PRESENTIAL",
        status: "SCHEDULED",
        establishmentId: "estab001",
        notes: notes || null,
      },
      include: {
        client: { select: { id: true, name: true } },
        professional: { select: { id: true, name: true } },
        service: {
          select: { id: true, name: true, price: true, durationMin: true },
        },
      },
    })

    return NextResponse.json(agendamento)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
