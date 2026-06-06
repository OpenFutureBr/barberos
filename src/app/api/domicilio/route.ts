import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

const ROLES_GESTAO = ["ADMIN", "ORG_OWNER", "ORG_MANAGER", "UNIT_MANAGER", "RECEPTIONIST"]

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const estabId = session?.user?.establishmentId
    const role = session?.user?.role
    if (!userId || !estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)

    const isGestao = ROLES_GESTAO.includes(role ?? "")

    const appointments = await prisma.appointment.findMany({
      where: {
        establishmentId: estabId,
        serviceType: "HOME_VISIT" as any,
        scheduledAt: { gte: hoje, lt: amanha },
        status: { notIn: ["CANCELLED", "NO_SHOW"] as any },
        ...(!isGestao ? { professionalId: userId } : {}),
      },
      include: {
        client: { select: { name: true, phone: true, homeAddress: true, homeCity: true, homeNumber: true, homeNeighborhood: true } },
        service: { select: { name: true, price: true } },
        professional: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { serviceZoneKm: true, serviceZoneAreas: true, attendsHome: true, bookingSlug: true, name: true },
    })

    return NextResponse.json({ appointments, zone: user })
  } catch (error) {
    console.error("[GET /api/domicilio]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const estabId = session?.user?.establishmentId
    const role = session?.user?.role
    if (!userId || !estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await request.json()
    const { appointmentId, status } = body

    const VALIDOS = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "DONE"]
    if (!VALIDOS.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    const isGestao = ROLES_GESTAO.includes(role ?? "")

    const appt = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        establishmentId: estabId,
        ...(!isGestao ? { professionalId: userId } : {}),
      },
      select: { id: true },
    })
    if (!appt) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: status as any,
        ...(status === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        ...(status === "DONE" ? { finishedAt: new Date() } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT /api/domicilio]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
