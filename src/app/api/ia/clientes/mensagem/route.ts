import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getIaConfig, callText } from "@/lib/ia-providers"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.establishmentId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session.user, "clientes_ia")
    if (bloqueio) return bloqueio

    const { clientId } = await req.json()
    if (!clientId) return NextResponse.json({ error: "clientId obrigatório" }, { status: 400 })

    const [cliente, estabelecimento] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId, establishmentId: session.user.establishmentId },
        select: { name: true, totalAtendimentos: true, lastVisitAt: true, avgVisitInterval: true, totalSpent: true, ticketMedio: true, favoritoCorte: true },
      }),
      prisma.establishment.findUnique({
        where: { id: session.user.establishmentId },
        select: { name: true },
      }),
    ])

    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

    const cfg = await getIaConfig()
    if (!cfg.groqApiKey && !cfg.geminiApiKey) return NextResponse.json({ error: "IA não configurada" }, { status: 503 })

    const agora = new Date()
    const diasSemVisita = cliente.lastVisitAt
      ? Math.floor((agora.getTime() - cliente.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const prompt = `Você é um assistente de comunicação para a barbearia "${estabelecimento?.name ?? "nossa barbearia"}".

Escreva uma mensagem de WhatsApp curta (máximo 3 linhas) para reconquistar o cliente "${cliente.name}".

Dados do cliente:
- ${cliente.totalAtendimentos} visitas no histórico
- Ticket médio: R$${Math.round(cliente.ticketMedio)}
- ${diasSemVisita !== null ? `Última visita: ${diasSemVisita} dias atrás` : "Sem registro de visita recente"}
- Intervalo habitual: ${cliente.avgVisitInterval ? `a cada ${cliente.avgVisitInterval} dias` : "variável"}
${cliente.favoritoCorte ? `- Corte favorito: ${cliente.favoritoCorte}` : ""}

A mensagem deve: ser informal e pessoal, usar o primeiro nome do cliente, mencionar saudade, convidar para agendar e transmitir valor (não oferecer desconto a menos que seja cliente VIP). Escreva apenas a mensagem, sem introdução ou explicação.`

    const mensagem = await callText(cfg, prompt)

    return NextResponse.json({ mensagem })
  } catch (error) {
    console.error("[POST /api/ia/clientes/mensagem]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
