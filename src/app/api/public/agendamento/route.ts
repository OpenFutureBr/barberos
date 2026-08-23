import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { clienteId, profId, servicoId, data, hora, estabId, tipoAtendimento } = body

  if (!clienteId || !profId || !servicoId || !data || !hora || !estabId) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  const scheduledAt = new Date(`${data}T${hora}:00-03:00`)

  // Serviço e profissional precisam pertencer ao MESMO estabelecimento
  // informado (estabId) — antes eram buscados só por id, então um caller
  // podia misturar profissional/serviço de uma barbearia com o estabId de
  // outra, criando um agendamento cruzado entre organizações.
  const servico = await prisma.service.findUnique({
    where: { id: servicoId, establishmentId: estabId },
    select: { durationMin: true },
  })
  const prof = await prisma.user.findUnique({
    where: { id: profId, establishmentId: estabId },
    select: { breakBetweenAppts: true },
  })

  if (!servico || !prof) {
    return NextResponse.json({ error: "Serviço ou profissional inválido para este estabelecimento." }, { status: 400 })
  }

  const duracao = servico.durationMin + (prof.breakBetweenAppts ?? 0)
  const fimNovo = new Date(scheduledAt.getTime() + duracao * 60000)

  const conflito = await prisma.appointment.findFirst({
    where: {
      professionalId: profId,
      status: { notIn: ["CANCELLED", "NO_SHOW", "DONE"] as any },
      scheduledAt: {
        lt: fimNovo,
        gte: new Date(scheduledAt.getTime() - duracao * 60000),
      },
    },
  })

  if (conflito) {
    return NextResponse.json({ error: "Horário indisponível. Por favor, escolha outro." }, { status: 409 })
  }

  const agendamento = await prisma.appointment.create({
    data: {
      establishmentId: estabId,
      clientId: clienteId,
      professionalId: profId,
      serviceId: servicoId,
      scheduledAt,
      status: "SCHEDULED" as any,
      serviceType: tipoAtendimento === "domicilio" ? "HOME_VISIT" : "PRESENTIAL",
    },
    select: {
      id: true,
      scheduledAt: true,
      service: { select: { name: true } },
      professional: { select: { name: true } },
    },
  })

  return NextResponse.json({ ok: true, agendamento }, { status: 201 })
}
