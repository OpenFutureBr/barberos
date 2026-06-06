import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    // Clientes com saldo de cashback ou loyalty account
    const clientes = await prisma.client.findMany({
      where: { establishmentId: estabId, isActive: true },
      include: {
        loyaltyAccount: {
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 50,
            },
          },
        },
      },
      orderBy: { cashbackBalance: "desc" },
    })

    // KPIs
    const saldoAtivo = clientes.reduce((s, c) => s + c.cashbackBalance, 0)
    const totalEarned = clientes.reduce((s, c) => s + (c.loyaltyAccount?.totalEarned ?? 0), 0)
    const totalRedeemed = clientes.reduce((s, c) => s + (c.loyaltyAccount?.totalRedeemed ?? 0), 0)

    // Ranking — clientes com qualquer saldo ou histórico
    const ranking = clientes
      .filter(c => c.cashbackBalance > 0 || (c.loyaltyAccount?.totalEarned ?? 0) > 0)
      .map(c => ({
        id: c.id,
        nome: c.name,
        saldo: c.cashbackBalance,
        totalGanho: c.loyaltyAccount?.totalEarned ?? 0,
        totalResgatado: c.loyaltyAccount?.totalRedeemed ?? 0,
        nivel: c.loyaltyLevel,
      }))
      .sort((a, b) => b.saldo - a.saldo)

    // Histórico — todas as transações de loyalty
    const todasTransacoes = clientes
      .filter(c => c.loyaltyAccount?.transactions?.length)
      .flatMap(c =>
        (c.loyaltyAccount?.transactions ?? []).map(t => ({
          id: t.id,
          cliente: c.name,
          tipo: t.type,
          valor: t.amount,
          descricao: t.description ?? "",
          createdAt: t.createdAt,
        }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)

    return NextResponse.json({ saldoAtivo, totalEarned, totalRedeemed, ranking, historico: todasTransacoes })
  } catch (error) {
    console.error("[GET /api/cashback]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
