import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { limitesHojeBRT } from "@/lib/data-brt"
import { temPermissao } from "@/lib/permissoes"

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    // Compartilhado por PIX, Fila de Espera e Painel TV.
    if (!["pix", "fila", "painel_tv"].some(r => temPermissao(session?.user, r))) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    const { inicio, fim } = limitesHojeBRT()

    const appointments = await prisma.appointment.findMany({
      where: {
        establishmentId: estabId,
        scheduledAt: { gte: inicio, lte: fim },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { name: true, price: true } },
        professional: { select: { name: true } },
        payment: { select: { id: true, method: true, amount: true, createdAt: true } },
      },
      orderBy: { scheduledAt: "asc" },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error("[GET /api/pix/cobrancas]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
