import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { limitesHojeBRT } from "@/lib/data-brt"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionData = await auth()
    const estabId = sessionData?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(sessionData?.user, "assinaturas")
    if (bloqueio) return bloqueio

    const { id } = await params
    const body = await request.json()
    const metodo: string = body.metodo ?? "PIX"

    const assinatura = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: { select: { name: true, price: true, establishmentId: true } },
        client: { select: { name: true } },
      },
    })

    if (!assinatura) return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 })

    // Garante que a assinatura pertence ao estabelecimento de quem chamou —
    // antes a sessão só era lida depois, e só para escolher o caixa do dia.
    if (assinatura.plan.establishmentId !== estabId) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 })
    }

    // Nova data de renovação: a partir da próxima data de cobrança (ou hoje se estiver vencida)
    const base = assinatura.nextBillingAt > new Date() ? assinatura.nextBillingAt : new Date()
    const novaRenovacao = new Date(base)
    novaRenovacao.setMonth(novaRenovacao.getMonth() + 1)

    // Atualiza a assinatura
    const atualizada = await prisma.subscription.update({
      where: { id },
      data: {
        status: "ACTIVE",
        nextBillingAt: novaRenovacao,
        pausedAt: null,
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        plan: { select: { id: true, name: true, price: true, cortesIncluidos: true, atendedomicilio: true } },
      },
    })

    // Registra como receita no caixa do dia
    const { inicio: inicioDia, fim: fimDia } = limitesHojeBRT()

    let caixa = await prisma.cashRegister.findFirst({
      where: { establishmentId: estabId, openedAt: { gte: inicioDia, lte: fimDia } },
      orderBy: { openedAt: "desc" },
    })

    if (!caixa) {
      caixa = await prisma.cashRegister.create({
        data: { establishmentId: estabId, openingAmount: 0 },
      })
    }

    await prisma.transaction.create({
      data: {
        cashRegisterId: caixa.id,
        type: "RECEITA",
        amount: assinatura.plan.price,
        description: `Renovação — ${assinatura.plan.name} · ${assinatura.client.name}`,
        method: metodo,
      },
    })

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error("[POST /api/assinaturas/assinantes/[id]/renovar]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
