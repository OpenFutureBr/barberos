import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limite = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "30"), 1), 100)

    const clientes = await prisma.client.findMany({
      where: { establishmentId: estabId, isActive: true },
      select: {
        id: true,
        name: true,
        cashbackBalance: true,
        loyaltyLevel: true,
        loyaltyAccount: {
          select: {
            totalEarned: true,
            totalRedeemed: true,
            transactions: {
              orderBy: { createdAt: "desc" },
              take: limite,
              select: { id: true, type: true, amount: true, description: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { cashbackBalance: "desc" },
    })

    const saldoAtivo = clientes.reduce((s, c) => s + c.cashbackBalance, 0)
    const totalEarned = clientes.reduce((s, c) => s + (c.loyaltyAccount?.totalEarned ?? 0), 0)
    const totalRedeemed = clientes.reduce((s, c) => s + (c.loyaltyAccount?.totalRedeemed ?? 0), 0)

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

    const historico = clientes
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
      .slice(0, limite)

    return NextResponse.json({ saldoAtivo, totalEarned, totalRedeemed, ranking, historico })
  } catch (error) {
    console.error("[GET /api/cashback]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
