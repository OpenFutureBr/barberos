import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { ServiceType, AppointmentStatus } from "@prisma/client"
import { auth } from "@/lib/auth"

import { addMinutes, addDays, isBefore, isAfter } from "date-fns"


function adicionarMinutos(data: Date, minutos: number) {
  return new Date(data.getTime() + minutos * 60 * 1000)
}

function datasSobrepoem(inicioA: Date, fimA: Date, inicioB: Date, fimB: Date) {
  return inicioA < fimB && fimA > inicioB
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const data = searchParams.get("data")

    const where: any = { establishmentId: estabId }

    if (data) {
      where.scheduledAt = {
        gte: new Date(`${data}T00:00:00-03:00`),
        lte: new Date(`${data}T23:59:59.999-03:00`),
      }
    }

    const agendamentos = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true, availableHome: true } },
      },
      orderBy: { scheduledAt: "asc" },
    })

    return NextResponse.json(agendamentos)
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await request.json()
    const { clientId, professionalId, serviceId, haircutId, scheduledAt, serviceType, notes } = body

    if (!clientId || !professionalId || !serviceId || !scheduledAt) {
      return NextResponse.json({ error: "Dados obrigatórios não informados" }, { status: 400 })
    }

    const startUtc = new Date(scheduledAt)
    startUtc.setSeconds(0, 0)

    if (Number.isNaN(startUtc.getTime())) {
      return NextResponse.json({ error: "Data/hora do agendamento inválida" }, { status: 400 })
    }

    const nowUtc = new Date()
    const maxUtc = addDays(nowUtc, 5)

    if (isBefore(startUtc, nowUtc)) {
      return NextResponse.json({ error: "Não é permitido agendar no passado" }, { status: 400 })
    }

    if (isAfter(startUtc, maxUtc)) {
      return NextResponse.json({ error: "Agendamentos permitidos apenas até 5 dias no futuro" }, { status: 400 })
    }

    const normalizedServiceType =
      serviceType === ServiceType.HOME_VISIT ? ServiceType.HOME_VISIT : ServiceType.PRESENTIAL

    // Busca serviço
    const service = await prisma.service.findFirst({
      where: { id: serviceId, establishmentId: estabId, isActive: true },
      select: { id: true, name: true, durationMin: true },
    })

    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado ou inativo" }, { status: 404 })
    }

    // Busca profissional — valida domicílio e pega intervalo
    const profissional = await prisma.user.findUnique({
      where: { id: professionalId },
      select: { attendsHome: true, breakBetweenAppts: true },
    })

    if (!profissional) {
      return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 })
    }

    // Valida domicílio pelo profissional, não pelo serviço
    if (normalizedServiceType === ServiceType.HOME_VISIT && !profissional.attendsHome) {
      return NextResponse.json(
        { error: "Este profissional não realiza atendimento a domicílio" },
        { status: 400 }
      )
    }

    // Usa intervalo do profissional (padrão 10 min)
    const descansoMin = profissional.breakBetweenAppts ?? 10
    const duracaoTotal = service.durationMin + descansoMin
    const endUtc = addMinutes(startUtc, duracaoTotal)

    // Verifica conflito
    const agendamentosExistentes = await prisma.appointment.findMany({
      where: {
        professionalId,
        establishmentId: estabId,
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        scheduledAt: {
          gte: addMinutes(startUtc, -24 * 60),
          lte: addMinutes(endUtc, 24 * 60),
        },
      },
      include: { service: { select: { durationMin: true } } },
      orderBy: { scheduledAt: "asc" },
    })

    const conflito = agendamentosExistentes.find((a) => {
      const inicioExistente = new Date(a.scheduledAt)
      const fimExistente = adicionarMinutos(
        inicioExistente,
        (a.service?.durationMin || 30) + descansoMin
      )
      return datasSobrepoem(startUtc, endUtc, inicioExistente, fimExistente)
    })

    if (conflito) {
      return NextResponse.json(
        { error: "Profissional já possui agendamento nesse intervalo, considerando duração do serviço e descanso." },
        { status: 409 }
      )
    }

    const agendamento = await prisma.appointment.create({
      data: {
        clientId,
        professionalId,
        serviceId,
        scheduledAt: startUtc,
        serviceType: normalizedServiceType,
        status: AppointmentStatus.SCHEDULED,
        establishmentId: estabId,
        haircutId: haircutId || null,
        notes: notes || null,
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true, availableHome: true } },
      },
    })

    return NextResponse.json(agendamento)
  } catch (error) {
    console.error("Erro ao criar agendamento:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.status === "IN_QUEUE") data.arrivedAt = new Date()
    if (body.status === "IN_PROGRESS") data.startedAt = new Date()
    if (body.status === "DONE") data.finishedAt = new Date()
    if (body.professionalId !== undefined) data.professionalId = body.professionalId
    if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt)

    // Quando entra em andamento, conclui automaticamente o anterior do mesmo barbeiro
    if (body.status === "IN_PROGRESS") {
      const current = await prisma.appointment.findUnique({
        where: { id: body.id },
        select: { professionalId: true },
      })
      if (current) {
        await prisma.appointment.updateMany({
          where: {
            professionalId: current.professionalId,
            status: AppointmentStatus.IN_PROGRESS,
            id: { not: body.id },
          },
          data: { status: AppointmentStatus.DONE, finishedAt: new Date() },
        })
      }
    }

    const agendamento = await prisma.appointment.update({
      where: { id: body.id },
      data,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
      },
    })

    return NextResponse.json(agendamento)
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}