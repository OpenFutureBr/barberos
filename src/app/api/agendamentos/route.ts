import { NextResponse } from "next/server"
import {
  PrismaClient,
  ServiceType,
  AppointmentStatus,
} from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { addMinutes, addDays, isBefore, isAfter } from "date-fns"

const DESCANSO_MIN = 10
const ESTABLISHMENT_ID = "estab001"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function adicionarMinutos(data: Date, minutos: number) {
  return new Date(data.getTime() + minutos * 60 * 1000)
}

function datasSobrepoem(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date
) {
  return inicioA < fimB && fimA > inicioB
}

/**
 * GET - Carrega agendamentos.
 * Se vier ?data=YYYY-MM-DD, filtra o dia local GMT-3.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get("data")

    const where: any = {
      establishmentId: ESTABLISHMENT_ID,
    }

    if (data) {
      const inicio = new Date(`${data}T00:00:00-03:00`)
      const fim = new Date(`${data}T23:59:59.999-03:00`)

      where.scheduledAt = {
        gte: inicio,
        lte: fim,
      }
    }

    const agendamentos = await prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        professional: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMin: true,
            availableHome: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    })

    return NextResponse.json(agendamentos)
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error)

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST - Cria agendamento com regras:
 * - não permite passado
 * - máximo 5 dias no futuro
 * - duração dinâmica pelo serviço
 * - descanso fixo de 10 minutos
 * - bloqueia conflito por profissional
 * - valida domicílio com availableHome
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

    const startUtc = new Date(scheduledAt)
    startUtc.setSeconds(0, 0)

    if (Number.isNaN(startUtc.getTime())) {
      return NextResponse.json(
        { error: "Data/hora do agendamento inválida" },
        { status: 400 }
      )
    }

    const nowUtc = new Date()
    const maxUtc = addDays(nowUtc, 5)

    if (isBefore(startUtc, nowUtc)) {
      return NextResponse.json(
        { error: "Não é permitido agendar no passado" },
        { status: 400 }
      )
    }

    if (isAfter(startUtc, maxUtc)) {
      return NextResponse.json(
        { error: "Agendamentos permitidos apenas até 5 dias no futuro" },
        { status: 400 }
      )
    }

    const normalizedServiceType =
      serviceType === ServiceType.HOME_VISIT
        ? ServiceType.HOME_VISIT
        : ServiceType.PRESENTIAL

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        establishmentId: ESTABLISHMENT_ID,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        durationMin: true,
        availableHome: true,
      },
    })

    if (!service) {
      return NextResponse.json(
        { error: "Serviço não encontrado ou inativo" },
        { status: 404 }
      )
    }

    if (
      normalizedServiceType === ServiceType.HOME_VISIT &&
      service.availableHome !== true
    ) {
      return NextResponse.json(
        { error: "Este serviço não está disponível para atendimento em domicílio" },
        { status: 400 }
      )
    }

    const duracaoTotalNovoServico = service.durationMin + DESCANSO_MIN
    const endUtc = addMinutes(startUtc, duracaoTotalNovoServico)

    /**
     * Buscamos agendamentos próximos e calculamos conflito em JS,
     * porque a duração de cada agendamento vem do serviço relacionado.
     */
    const agendamentosExistentes = await prisma.appointment.findMany({
      where: {
        professionalId,
        establishmentId: ESTABLISHMENT_ID,
        status: {
          notIn: [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
          ],
        },
        scheduledAt: {
          gte: addMinutes(startUtc, -24 * 60),
          lte: addMinutes(endUtc, 24 * 60),
        },
      },
      include: {
        service: {
          select: {
            durationMin: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    })

    const conflito = agendamentosExistentes.find((agendamentoExistente) => {
      const inicioExistente = new Date(agendamentoExistente.scheduledAt)

      const duracaoTotalExistente =
        (agendamentoExistente.service?.durationMin || 30) + DESCANSO_MIN

      const fimExistente = adicionarMinutos(
        inicioExistente,
        duracaoTotalExistente
      )

      return datasSobrepoem(
        startUtc,
        endUtc,
        inicioExistente,
        fimExistente
      )
    })

    if (conflito) {
      return NextResponse.json(
        {
          error:
            "Profissional já possui agendamento nesse intervalo, considerando duração do serviço e descanso.",
        },
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
        establishmentId: ESTABLISHMENT_ID,
        notes: notes || null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        professional: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMin: true,
            availableHome: true,
          },
        },
      },
    })

    return NextResponse.json(agendamento)
  } catch (error) {
    console.error("Erro ao criar agendamento:", error)

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT - Atualiza status do agendamento.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()

    if (!body.id || !body.status) {
      return NextResponse.json(
        { error: "ID e status são obrigatórios" },
        { status: 400 }
      )
    }

    const agendamento = await prisma.appointment.update({
      where: {
        id: body.id,
      },
      data: {
        status: body.status,
      },
    })

    return NextResponse.json(agendamento)
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error)

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
