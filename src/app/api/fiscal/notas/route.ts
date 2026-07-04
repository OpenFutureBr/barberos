import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Ainda não existe integração real de emissão de NF-e — este endpoint expõe
// os atendimentos concluídos (dados reais) que precisariam de nota, sempre
// como "PENDENTE" de emissão, em vez dos dados mocados que existiam antes.
export async function GET(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const dataParam = searchParams.get("data")

    const base = dataParam ? new Date(`${dataParam}T00:00:00`) : new Date()
    const inicio = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0)
    const fim = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59)

    const appointments = await prisma.appointment.findMany({
      where: {
        establishmentId: ESTAB_ID,
        status: "DONE",
        finishedAt: { gte: inicio, lte: fim },
      },
      select: {
        id: true,
        finishedAt: true,
        client: { select: { name: true } },
        service: { select: { name: true, price: true } },
        payment: { select: { amount: true, status: true, method: true } },
      },
      orderBy: { finishedAt: "desc" },
    })

    const notas = appointments.map((a) => ({
      id: a.id,
      cliente: a.client.name,
      servico: a.service.name,
      valor: a.payment?.amount ?? a.service.price,
      metodo: a.payment?.method ?? null,
      status: "PENDENTE" as const,
      finalizadoEm: a.finishedAt,
    }))

    return NextResponse.json(notas)
  } catch (error) {
    console.error("[GET /api/fiscal/notas]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
