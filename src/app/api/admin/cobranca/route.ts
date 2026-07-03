import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Endpoint de automação de faturamento — pode ser chamado por um admin logado
// ou por um cron job externo headless. Sem sessão de usuário, exige o header
// x-cron-secret batendo com process.env.CRON_SECRET. Sem CRON_SECRET configurado,
// só admin logado passa (fail closed — antes não havia nenhuma checagem aqui).
async function autorizado(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get("x-cron-secret")
  if (cronSecret && headerSecret === cronSecret) return true

  const session = await auth()
  return (session?.user as any)?.role === "ADMIN"
}

async function upsertMetric(organizationId: string, metric: string, value: number, referenceMonth: string) {
  const existing = await prisma.usageMetric.findFirst({
    where: { organizationId, establishmentId: null, metric, referenceMonth },
    select: { id: true },
  })
  if (existing) {
    return prisma.usageMetric.update({ where: { id: existing.id }, data: { value } })
  }
  return prisma.usageMetric.create({ data: { organizationId, metric, value, referenceMonth } })
}

/**
 * POST /api/admin/cobranca
 * Processa inadimplência e gera faturas mensais automáticas.
 * Pode ser chamado manualmente pelo admin ou via cron job externo.
 */
export async function POST(req: Request) {
  if (!(await autorizado(req))) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const diasTolerancia = Number(body.diasTolerancia ?? 7)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limiteParaSuspensao = new Date(hoje)
  limiteParaSuspensao.setDate(hoje.getDate() - diasTolerancia)

  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`

  // ── 1. Trial expirado → ACTIVE (ou OVERDUE se já venceu) ─────────────────
  const trialsExpirados = await prisma.organization.findMany({
    where: {
      billingStatus: "TRIAL" as any,
      trialEndsAt: { lt: hoje },
    },
    include: { subscriptions: { where: { status: "TRIAL" as any } } },
  })

  // Antes: 1-2 updates sequenciais por organização com trial vencido.
  // Agora: agrupa por resultado (ACTIVE vs OVERDUE) e faz no máximo 3
  // updateMany em paralelo, independente de quantas organizações vencerem.
  const idsParaActive: string[] = []
  const idsParaOverdue: string[] = []
  for (const org of trialsExpirados) {
    if (org.subscriptions.length > 0) idsParaActive.push(org.id)
    else idsParaOverdue.push(org.id)
  }

  await Promise.all([
    idsParaActive.length > 0
      ? prisma.organization.updateMany({
          where: { id: { in: idsParaActive } },
          data: { billingStatus: "ACTIVE" as any },
        })
      : null,
    idsParaOverdue.length > 0
      ? prisma.organization.updateMany({
          where: { id: { in: idsParaOverdue } },
          data: { billingStatus: "OVERDUE" as any },
        })
      : null,
    idsParaActive.length > 0
      ? prisma.organizationSubscription.updateMany({
          where: { organizationId: { in: idsParaActive }, status: "TRIAL" as any },
          data: { status: "ACTIVE" as any },
        })
      : null,
  ])

  const trialsConvertidos = trialsExpirados.length

  // ── 2. Gera faturas para assinaturas com nextBillingAt <= hoje ────────────
  const assinaturasVencendo = await prisma.organizationSubscription.findMany({
    where: {
      status: "ACTIVE" as any,
      nextBillingAt: { lte: hoje },
    },
    include: { organization: { select: { id: true, name: true } } },
  })

  let faturasGeradas = 0
  for (const sub of assinaturasVencendo) {
    // Verifica se já existe fatura para este mês
    const jaExiste = await prisma.organizationInvoice.findFirst({
      where: { organizationId: sub.organizationId, referenceMonth: mesAtual },
    })
    if (jaExiste) continue

    // Cria a fatura com vencimento daqui a 5 dias
    const vencimento = new Date(hoje)
    vencimento.setDate(hoje.getDate() + 5)

    await prisma.$transaction(async (tx) => {
      await tx.organizationInvoice.create({
        data: {
          organizationId: sub.organizationId,
          status: "PENDING" as any,
          amount: sub.price,
          dueDate: vencimento,
          referenceMonth: mesAtual,
          notes: `Mensalidade ${mesAtual} — gerada automaticamente`,
        },
      })

      // Avança nextBillingAt para o próximo mês
      const proximo = new Date(sub.nextBillingAt ?? hoje)
      proximo.setMonth(proximo.getMonth() + 1)
      await tx.organizationSubscription.update({
        where: { id: sub.id },
        data: { nextBillingAt: proximo },
      })
    })

    faturasGeradas++
  }

  // ── 3. Faturas PENDING vencidas → OVERDUE ────────────────────────────────
  const faturasVencidas = await prisma.organizationInvoice.updateMany({
    where: { status: "PENDING", dueDate: { lt: hoje } },
    data: { status: "OVERDUE" as any },
  })

  // ── 4. Organizações com faturas OVERDUE → billingStatus OVERDUE ──────────
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

  // ── 5. Fatura vencida há +N dias → SUSPENDED ─────────────────────────────
  const orgsParaSuspender = await prisma.organizationInvoice.findMany({
    where: { status: "OVERDUE" as any, dueDate: { lt: limiteParaSuspensao } },
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
    await prisma.organizationSubscription.updateMany({
      where: { organizationId: { in: idsParaSuspender } },
      data: { status: "SUSPENDED" as any },
    })
  }

  // ── 6. Quitadas sem pendências → reativa ─────────────────────────────────
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

  // ── 7. Consolida UsageMetrics do mês atual por organização ───────────────
  const orgsAtivas = await prisma.organization.findMany({
    where: { isActive: true, isBlocked: false },
    select: { id: true, establishments: { select: { id: true } } },
  })

  for (const org of orgsAtivas) {
    const estabIds = org.establishments.map(e => e.id)
    if (estabIds.length === 0) continue

    const [agendamentos, clientes, usuarios] = await Promise.all([
      prisma.appointment.count({
        where: {
          establishmentId: { in: estabIds },
          status: "DONE" as any,
          scheduledAt: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1), lte: hoje },
        },
      }),
      prisma.client.count({
        where: { establishmentId: { in: estabIds }, createdAt: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) } },
      }),
      prisma.user.count({
        where: { organizationId: org.id, isActive: true },
      }),
    ])

    await Promise.all([
      upsertMetric(org.id, "agendamentos_mes", agendamentos, mesAtual),
      upsertMetric(org.id, "clientes_novos_mes", clientes, mesAtual),
      upsertMetric(org.id, "usuarios_ativos", usuarios, mesAtual),
    ])
  }

  return NextResponse.json({
    ok: true,
    trialsConvertidos,
    faturasGeradas,
    faturasVencidas: faturasVencidas.count,
    orgsAtualizadasOverdue,
    orgsSuspensas,
    orgsReativadas,
    metricsConsolidadas: orgsAtivas.length,
    processadoEm: new Date().toISOString(),
  })
}
