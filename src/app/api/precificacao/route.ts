import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { temPermissao, bloqueioSemPermissao } from "@/lib/permissoes"

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    // Também usado pelo AgendaModal (calcular markup/desconto ao agendar) —
    // libera se tiver "precificacao" ou só "agenda".
    if (!temPermissao(session?.user, "precificacao") && !temPermissao(session?.user, "agenda")) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    const regras = await prisma.pricingRule.findMany({
      where: { establishmentId: estabId },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json(regras)
  } catch (error) {
    console.error("[GET /api/precificacao]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "precificacao")
    if (bloqueio) return bloqueio

    const body = await request.json()
    const regra = await prisma.pricingRule.create({
      data: {
        name: String(body.name),
        description: body.description || null,
        isActive: body.isActive !== false,
        markupPct: parseFloat(body.markupPct) || 0,
        discountPct: parseFloat(body.discountPct) || 0,
        daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : [],
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        establishmentId: estabId,
      },
    })
    return NextResponse.json(regra)
  } catch (error) {
    console.error("[POST /api/precificacao]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
