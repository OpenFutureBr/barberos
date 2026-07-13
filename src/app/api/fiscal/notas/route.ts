import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hojeISOemBRT, limitesDiaBRT } from "@/lib/data-brt"
import { bloqueioSemPermissao } from "@/lib/permissoes"

// Ainda não existe integração real de emissão de NF-e — este endpoint expõe
// os atendimentos concluídos (dados reais) que precisariam de nota, sempre
// como "PENDENTE" de emissão, em vez dos dados mocados que existiam antes.
export async function GET(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "fiscal")
    if (bloqueio) return bloqueio

    const { searchParams } = new URL(request.url)
    const dataParam = searchParams.get("data")

    const { inicio, fim } = limitesDiaBRT(dataParam ?? hojeISOemBRT())

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
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
