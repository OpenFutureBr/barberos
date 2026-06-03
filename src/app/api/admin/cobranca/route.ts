import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * POST /api/admin/cobranca
 * Processa inadimplência: marca faturas vencidas como OVERDUE,
 * atualiza billingStatus das organizações e suspende as com faturas
 * vencidas há mais de N dias (padrão: 7).
 *
 * Pode ser chamado manualmente pelo admin ou via cron job externo.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const diasTolerancia = Number(body.diasTolerancia ?? 7)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limiteParaSuspensao = new Date(hoje)
  limiteParaSuspensao.setDate(hoje.getDate() - diasTolerancia)

  // 1. Marca faturas PENDING com vencimento passado como OVERDUE
  const faturasVencidas = await prisma.organizationInvoice.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: hoje },
    },
    data: { status: "OVERDUE" as any },
  })

  // 2. Organizações com faturas OVERDUE → billingStatus OVERDUE
  const orgsComFaturaVencida = await prisma.organizationInvoice.findMany({
    where: { status: "OVERDUE" as any },
    select: { organizationId: true },
    distinct: ["organizationId"],
  })
  const idsOverdue = orgsComFaturaVencida.map(o => o.organizationId)

  let orgsAtualizadasOverdue = 0
  if (idsOverdue.length > 0) {
    const r = await prisma.organization.updateMany({
      where: { id: { in: idsOverdue }, billingStatus: { not: "SUSPENDED" as any } },
      data: { billingStatus: "OVERDUE" as any },
    })
    orgsAtualizadasOverdue = r.count
  }

  // 3. Organizações com fatura vencida há mais de N dias → SUSPENDED
  const orgsParaSuspender = await prisma.organizationInvoice.findMany({
    where: {
      status: "OVERDUE" as any,
      dueDate: { lt: limiteParaSuspensao },
    },
    select: { organizationId: true },
    distinct: ["organizationId"],
  })
  const idsParaSuspender = orgsParaSuspender.map(o => o.organizationId)

  let orgsSuspensas = 0
  if (idsParaSuspender.length > 0) {
    const r = await prisma.organization.updateMany({
      where: { id: { in: idsParaSuspender }, isBlocked: false },
      data: { billingStatus: "SUSPENDED" as any, isBlocked: true },
    })
    orgsSuspensas = r.count

    // Suspende as assinaturas também
    await prisma.organizationSubscription.updateMany({
      where: { organizationId: { in: idsParaSuspender } },
      data: { status: "SUSPENDED" as any },
    })
  }

  // 4. Organizações sem faturas vencidas pendentes → volta para ACTIVE
  const orgsQuitadas = await prisma.organization.findMany({
    where: {
      billingStatus: { in: ["OVERDUE", "SUSPENDED"] as any },
      invoices: { none: { status: { in: ["PENDING", "OVERDUE"] as any } } },
    },
    select: { id: true },
  })

  let orgsReativadas = 0
  if (orgsQuitadas.length > 0) {
    const ids = orgsQuitadas.map(o => o.id)
    const r = await prisma.organization.updateMany({
      where: { id: { in: ids } },
      data: { billingStatus: "ACTIVE" as any, isBlocked: false },
    })
    orgsReativadas = r.count

    await prisma.organizationSubscription.updateMany({
      where: { organizationId: { in: ids } },
      data: { status: "ACTIVE" as any },
    })
  }

  return NextResponse.json({
    ok: true,
    faturasVencidas: faturasVencidas.count,
    orgsAtualizadasOverdue,
    orgsSuspensas,
    orgsReativadas,
    processadoEm: new Date().toISOString(),
  })
}
