import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getIaConfig, callText } from "@/lib/ia-providers"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function POST(req: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "agenda")
    if (bloqueio) return bloqueio

    const { clienteId, servicoId } = await req.json()
    if (!clienteId || !servicoId) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })

    const cfg = await getIaConfig()
    if (!cfg.groqApiKey && !cfg.geminiApiKey) {
      return NextResponse.json({ error: "IA não configurada" }, { status: 503 })
    }

    const ha6meses = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

    const [cliente, servico, historico] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clienteId, establishmentId: estabId },
        select: { name: true, cashbackBalance: true, loyaltyLevel: true, favoritoCorte: true, totalAtendimentos: true },
      }),
      prisma.service.findUnique({
        where: { id: servicoId, establishmentId: estabId },
        select: { name: true, price: true, durationMin: true },
      }),
      prisma.appointment.findMany({
        where: {
          clientId: clienteId,
          establishmentId: estabId,
          scheduledAt: { gte: ha6meses },
          status: { in: ["DONE"] },
        },
        select: {
          scheduledAt: true,
          service: { select: { name: true } },
          status: true,
        },
        orderBy: { scheduledAt: "desc" },
        take: 10,
      }),
    ])

    if (!cliente || !servico) {
      return NextResponse.json({ error: "Cliente ou serviço não encontrado" }, { status: 404 })
    }

    const totalAtend = historico.length
    const atendEsteSev = historico.filter(a => a.service?.name === servico.name).length
    const ultimoAtend = historico[0]
    const diasDesdeUltimo = ultimoAtend
      ? Math.floor((Date.now() - new Date(ultimoAtend.scheduledAt).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const prompt = `Você é um assistente de barbearia. Gere um insight CURTO (1-2 frases) sobre este agendamento.

Cliente: ${cliente.name}
Nível fidelidade: ${cliente.loyaltyLevel ?? "Padrão"}
Saldo cashback: R$${cliente.cashbackBalance.toFixed(2)}
Total de atendimentos (histórico): ${cliente.totalAtendimentos}
${cliente.favoritoCorte ? `Corte favorito: ${cliente.favoritoCorte}` : ""}
Serviço: ${servico.name} (R$${servico.price}, ${servico.durationMin}min)
Atendimentos nos últimos 6 meses: ${totalAtend}
Vezes com este serviço: ${atendEsteSev}
${diasDesdeUltimo !== null ? `Último atendimento: há ${diasDesdeUltimo} dias` : "Primeiro atendimento"}

Seja objetivo e útil para o barbeiro. Ex: se o cliente tem cashback, sugira usar. Se voltou rápido, elogie. Se demorou muito, mencione.`

    const insight = await callText(cfg, prompt)
    return NextResponse.json({ insight })
  } catch (e) {
    console.error("[POST /api/ia/agendamento]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
