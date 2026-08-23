import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

function gerarSlots(inicio = "08:00", fim = "18:00", intervalo = 10) {
  const slots: string[] = []
  const [hI, mI] = inicio.split(":").map(Number)
  const [hF, mF] = fim.split(":").map(Number)
  let min = hI * 60 + mI
  const fimMin = hF * 60 + mF
  while (min <= fimMin) {
    slots.push(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`)
    min += intervalo
  }
  return slots
}

function adicionarMinutos(d: Date, m: number) {
  return new Date(d.getTime() + m * 60000)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const estabId = searchParams.get("estabId") ?? ""
  const profId = searchParams.get("profId") ?? ""
  const data = searchParams.get("data") ?? ""
  const serviceId = searchParams.get("serviceId") ?? ""

  if (!estabId || !profId || !data || !serviceId) {
    return NextResponse.json([], { status: 400 })
  }

  // prof/servico escopados pelo mesmo estabId — sem isso, dava pra consultar
  // disponibilidade de um profissional/serviço de outra barbearia.
  const [estab, prof, servico, agendamentos] = await Promise.all([
    prisma.establishment.findUnique({
      where: { id: estabId },
      select: { businessHours: true },
    }),
    prisma.user.findUnique({
      where: { id: profId, establishmentId: estabId },
      select: {
        breakBetweenAppts: true,
        schedules: { select: { dayOfWeek: true, startTime: true, endTime: true, isActive: true } },
      },
    }),
    prisma.service.findUnique({
      where: { id: serviceId, establishmentId: estabId },
      select: { durationMin: true },
    }),
    prisma.appointment.findMany({
      where: {
        establishmentId: estabId,
        professionalId: profId,
        scheduledAt: {
          gte: new Date(`${data}T00:00:00-03:00`),
          lte: new Date(`${data}T23:59:59-03:00`),
        },
        status: { notIn: ["CANCELLED", "NO_SHOW", "DONE"] as any },
      },
      select: { scheduledAt: true, service: { select: { durationMin: true } } },
    }),
  ])

  if (!estab || !prof || !servico) return NextResponse.json([])

  const diaSemana = new Date(data + "T12:00:00").getDay()
  const businessHours = Array.isArray(estab.businessHours) ? estab.businessHours as any[] : []
  const diaEstab = businessHours.find((d: any) => d.dayOfWeek === diaSemana)

  if (!diaEstab?.isOpen) return NextResponse.json([])

  const inicioEstab = diaEstab.openTime ?? "08:00"
  const fimEstab = diaEstab.closeTime ?? "18:00"

  const schedule = prof.schedules?.find((s: any) => s.dayOfWeek === diaSemana && s.isActive)
  const inicioProf = schedule?.startTime ?? inicioEstab
  const fimProf = schedule?.endTime ?? fimEstab

  const inicioEfetivo = inicioProf > inicioEstab ? inicioProf : inicioEstab
  const fimEfetivo = fimProf < fimEstab ? fimProf : fimEstab

  const descanso = prof.breakBetweenAppts ?? 0
  const duracao = servico.durationMin + descanso

  const slots = gerarSlots(inicioEfetivo, fimEfetivo, 10)
  const agora = adicionarMinutos(new Date(), 5)
  const fimEfetivoDate = new Date(`${data}T${fimEfetivo}:00-03:00`)

  const disponiveis = slots.filter((h) => {
    const inicio = new Date(`${data}T${h}:00-03:00`)
    const fim = adicionarMinutos(inicio, duracao)
    if (inicio <= agora) return false
    if (inicio >= fimEfetivoDate) return false
    return !agendamentos.some((a) => {
      const aInicio = new Date(a.scheduledAt)
      const aFim = adicionarMinutos(aInicio, (a.service?.durationMin ?? 30) + descanso)
      return inicio < aFim && fim > aInicio
    })
  })

  return NextResponse.json(disponiveis)
}
