import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const dias = Math.max(1, parseInt(searchParams.get("dias") ?? "7") || 7)

    const limiteInicio = new Date()
    limiteInicio.setDate(limiteInicio.getDate() - dias)
    limiteInicio.setHours(0, 0, 0, 0)

    const clientes = await prisma.client.findMany({
      where: { establishmentId: estabId, isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        appointments: {
          select: { status: true, scheduledAt: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const inativos = clientes
      .filter(c => !c.appointments.some(
        a => a.status === "DONE" && new Date(a.scheduledAt) >= limiteInicio
      ))
      .map(c => {
        const cancelados = c.appointments.filter(
          a => a.status === "CANCELLED" && new Date(a.scheduledAt) >= limiteInicio
        ).length
        const concluidos = c.appointments.filter(a => a.status === "DONE").length
        const ultimaVisita = c.appointments
          .filter(a => a.status === "DONE")
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0]?.scheduledAt ?? null
        return { id: c.id, name: c.name, phone: c.phone, cancelados, concluidos, ultimaVisita }
      })
      .sort((a, b) => {
        if (b.concluidos !== a.concluidos) return b.concluidos - a.concluidos
        return a.name.localeCompare(b.name, "pt-BR")
      })

    return NextResponse.json(inativos)
  } catch (error) {
    console.error("[GET /api/dashboard/inativos]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
