import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

async function assertAdmin() {
  const session = await auth()
  if ((session?.user as any)?.role !== "ADMIN") return false
  return true
}

function arredondar(v: number) {
  return Math.round(v * 100) / 100
}

export async function GET() {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const [subscriptions, invoices] = await Promise.all([
    prisma.organizationSubscription.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] as any } },
      select: { price: true, status: true, nextBillingAt: true, organizationId: true },
    }),

    prisma.organizationInvoice.findMany({
      orderBy: { dueDate: "desc" },
      include: {
        organization: { select: { id: true, name: true, cnpj: true } },
      },
    }),
  ])

  const mrr = subscriptions.reduce((s, sub) => s + sub.price, 0)
  const arr = mrr * 12

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const faturasPorStatus = {
    pendentes: invoices.filter(i => i.status === "PENDING" && new Date(i.dueDate) >= hoje),
    vencidas:  invoices.filter(i => i.status === "PENDING" && new Date(i.dueDate) < hoje),
    pagas:     invoices.filter(i => i.status === "PAID"),
    canceladas: invoices.filter(i => i.status === "CANCELLED"),
  }

  const totalPendente = faturasPorStatus.pendentes.reduce((s, i) => s + i.amount, 0)
  const totalVencido  = faturasPorStatus.vencidas.reduce((s, i) => s + i.amount, 0)
  const totalRecebido = faturasPorStatus.pagas.reduce((s, i) => s + i.amount, 0)

  return NextResponse.json({
    mrr: arredondar(mrr),
    arr: arredondar(arr),
    ativos: subscriptions.filter(s => s.status === "ACTIVE").length,
    trial: subscriptions.filter(s => s.status === "TRIAL").length,
    totalPendente: arredondar(totalPendente),
    totalVencido: arredondar(totalVencido),
    totalRecebido: arredondar(totalRecebido),
    faturas: invoices.map(i => ({
      id: i.id,
      organizacaoId: i.organizationId,
      organizacaoNome: i.organization.name,
      organizacaoCnpj: i.organization.cnpj,
      status: i.status,
      amount: i.amount,
      dueDate: i.dueDate,
      paidAt: i.paidAt,
      referenceMonth: i.referenceMonth,
      notes: i.notes,
      vencida: i.status === "PENDING" && new Date(i.dueDate) < hoje,
    })),
  })
}
