import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"

const DEFAULTS: Record<string, { nome: string; descricao: string; tipo: string; defaultAtiva: boolean }> = {
  confirmacao: { nome: "Confirmação de agendamento", descricao: "Enviada 24h antes do horário", tipo: "confirmacao", defaultAtiva: true },
  lembrete: { nome: "Lembrete 1h antes", descricao: "Enviada 1h antes do horário", tipo: "lembrete", defaultAtiva: true },
  risco: { nome: "Cliente em risco", descricao: "Enviada quando cliente passa do intervalo habitual", tipo: "risco", defaultAtiva: true },
  pix: { nome: "PIX gerado", descricao: "Envia link do PIX após confirmar o serviço", tipo: "pix", defaultAtiva: true },
  aniversario: { nome: "Aniversário", descricao: "Parabéns com cupom de desconto no dia do aniversário", tipo: "aniversario", defaultAtiva: false },
  avaliacao: { nome: "Pós-atendimento", descricao: "Avaliação enviada após o atendimento", tipo: "avaliacao", defaultAtiva: false },
}

// GET /api/whatsapp/automacoes
export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "whatsapp")
    if (bloqueio) return bloqueio

    const estab = await prisma.establishment.findUnique({
      where: { id: estabId },
      select: { whatsappConfig: true },
    })

    const config = (estab?.whatsappConfig ?? {}) as Record<string, unknown>
    const toggles = (config.automacoes ?? {}) as Record<string, boolean>

    // Count sends per type from logs (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const counts = await prisma.whatsAppLog.groupBy({
      by: ["automationType"],
      where: { establishmentId: estabId, source: "automation", sentAt: { gte: since } },
      _count: { id: true },
    })
    const countMap = Object.fromEntries(
      counts.filter(c => c.automationType).map(c => [c.automationType!, c._count.id])
    )

    const result = Object.values(DEFAULTS).map(d => ({
      ...d,
      ativa: toggles[d.tipo] !== undefined ? toggles[d.tipo] : d.defaultAtiva,
      enviadas: countMap[d.tipo] ?? 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

// PUT /api/whatsapp/automacoes  body: { tipo: string, ativa: boolean }
export async function PUT(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "whatsapp")
    if (bloqueio) return bloqueio

    const { tipo, ativa } = await request.json()
    if (!tipo || ativa === undefined) return NextResponse.json({ error: "tipo e ativa são obrigatórios" }, { status: 400 })

    const estab = await prisma.establishment.findUnique({ where: { id: estabId }, select: { whatsappConfig: true } })
    const config = (estab?.whatsappConfig ?? {}) as Record<string, unknown>
    const toggles = ((config.automacoes ?? {}) as Record<string, boolean>)
    toggles[tipo] = ativa

    await prisma.establishment.update({
      where: { id: estabId },
      data: { whatsappConfig: { ...config, automacoes: toggles } },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
