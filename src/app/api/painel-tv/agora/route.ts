import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const agora = new Date()
    const fim = new Date(agora.getTime() + 30 * 60 * 1000)
    const inicioDia = new Date(agora)
    inicioDia.setHours(0, 0, 0, 0)

    // Busca IN_PROGRESS sempre + agendamentos do dia dentro da janela
    const agendamentos = await prisma.appointment.findMany({
      where: {
        establishmentId: "estab001",
        OR: [
          { status: "IN_PROGRESS" as any },
          {
            status: { notIn: ["CANCELLED", "NO_SHOW", "DONE", "IN_PROGRESS"] as any },
            scheduledAt: { gte: inicioDia, lte: fim },
          },
        ],
      },
      include: {
        client: { select: { name: true } },
        service: { select: { durationMin: true } },
        professional: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    })

    // Agrupa por profissional — prioriza IN_PROGRESS
    const porProf = new Map<string, typeof agendamentos[0]>()
    for (const a of agendamentos) {
      if (!a.professionalId) continue
      const atual = porProf.get(a.professionalId)
      if (!atual || (a.status === "IN_PROGRESS" && atual.status !== "IN_PROGRESS")) {
        porProf.set(a.professionalId, a)
      }
    }

    const resultado = Array.from(porProf.values())
      .map(a => ({
        id: a.professional.id,
        name: a.professional.name,
        appt: {
          id: a.id,
          status: a.status,
          scheduledAt: a.scheduledAt,
          startedAt: a.startedAt,
          client: a.client,
          service: a.service,
        },
      }))
      .sort((a, b) => {
        if (a.appt.status === "IN_PROGRESS" && b.appt.status !== "IN_PROGRESS") return -1
        if (b.appt.status === "IN_PROGRESS" && a.appt.status !== "IN_PROGRESS") return 1
        return new Date(a.appt.scheduledAt).getTime() - new Date(b.appt.scheduledAt).getTime()
      })

    return NextResponse.json(resultado)
  } catch (error) {
    console.error("[GET /api/painel-tv/agora]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
