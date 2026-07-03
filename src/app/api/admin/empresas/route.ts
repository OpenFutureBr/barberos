import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"

async function assertAdmin() {
  const session = await auth()
  if ((session?.user as any)?.role !== "ADMIN") return false
  return true
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

function normalizarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60)
}

async function gerarSlugUnico(base: string) {
  const slugBase = normalizarSlug(base) || "empresa"
  let slug = slugBase

  for (let i = 1; i <= 50; i++) {
    const existe = await prisma.establishment.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    })

    if (!existe) return slug

    slug = `${slugBase}-${i + 1}`
  }

  return `${slugBase}-${Date.now()}`
}

async function gerarUsernameUnico(base: string) {
  const usernameBase =
    normalizarSlug(base).replace(/-/g, ".").replace(/\.+/g, ".") || "usuario"

  let username = usernameBase

  for (let i = 1; i <= 50; i++) {
    const existe = await prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
      },
    })

    if (!existe) return username

    username = `${usernameBase}.${i + 1}`
  }

  return `${usernameBase}.${Date.now()}`
}

function proximoVencimentoDia5() {
  const hoje = new Date()
  const vencimento = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + 1,
    5,
    12,
    0,
    0,
  )

  return vencimento
}

export async function GET() {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  try {
    const organizations = await prisma.organization.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            priceMonthly: true,
            maxEstablishments: true,
            maxUsers: true,
            maxClients: true,
            maxAppointments: true,
            maxStorageMb: true,
          },
        },
        subscriptions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            price: true,
            nextBillingAt: true,
            lastPaidAt: true,
            provider: true,
          },
        },
        storageUsage: {
          select: {
            totalFiles: true,
            totalSizeMb: true,
            updatedAt: true,
          },
        },
        establishments: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        users: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    })

    // Antes: 3 queries extras por organização (N+1). Agora: 3 queries no
    // total, agregadas por establishmentId, e distribuídas por org em memória.
    const allEstablishmentIds = organizations.flatMap((org) =>
      org.establishments.map((e) => e.id),
    )

    const [clientesPorEstab, agendamentosPorEstab, pagamentosPendentesPorEstab] =
      allEstablishmentIds.length > 0
        ? await Promise.all([
            prisma.client.groupBy({
              by: ["establishmentId"],
              where: { establishmentId: { in: allEstablishmentIds } },
              _count: { id: true },
            }),

            prisma.appointment.groupBy({
              by: ["establishmentId"],
              where: { establishmentId: { in: allEstablishmentIds } },
              _count: { id: true },
            }),

            prisma.payment.findMany({
              where: {
                status: "PENDING",
                appointment: { establishmentId: { in: allEstablishmentIds } },
              },
              select: {
                amount: true,
                appointment: { select: { establishmentId: true } },
              },
            }),
          ])
        : [[], [], [] as { amount: number; appointment: { establishmentId: string } }[]]

    const clientesMap = new Map(
      clientesPorEstab.map((c) => [c.establishmentId, c._count.id]),
    )
    const agendamentosMap = new Map(
      agendamentosPorEstab.map((a) => [a.establishmentId, a._count.id]),
    )
    const pendentesMap = new Map<string, { count: number; total: number }>()
    for (const p of pagamentosPendentesPorEstab) {
      const eid = p.appointment.establishmentId
      const cur = pendentesMap.get(eid) ?? { count: 0, total: 0 }
      cur.count += 1
      cur.total += p.amount
      pendentesMap.set(eid, cur)
    }

    const result = organizations.map((org) => {
      const establishmentIds = org.establishments.map((e) => e.id)

      const totalClientes = establishmentIds.reduce(
        (s, eid) => s + (clientesMap.get(eid) ?? 0),
        0,
      )
      const totalAgendamentos = establishmentIds.reduce(
        (s, eid) => s + (agendamentosMap.get(eid) ?? 0),
        0,
      )
      let pendingPayments = 0
      let valorPendente = 0
      for (const eid of establishmentIds) {
        const p = pendentesMap.get(eid)
        if (p) {
          pendingPayments += p.count
          valorPendente += p.total
        }
      }

      const assinatura = org.subscriptions[0] ?? null

        return {
          id: org.id,
          name: org.name,
          legalName: org.legalName,
          cnpj: org.cnpj,
          email: org.email,
          phone: org.phone,

          isActive: org.isActive,
          isBlocked: org.isBlocked,
          iaLicensed: org.iaLicensed,
          billingStatus: org.billingStatus,
          createdAt: org.createdAt,
          lastAccessAt: org.lastAccessAt,

          plan: org.plan
            ? {
                id: org.plan.id,
                name: org.plan.name,
                priceMonthly: org.plan.priceMonthly,
                maxEstablishments: org.plan.maxEstablishments,
                maxUsers: org.plan.maxUsers,
                maxClients: org.plan.maxClients,
                maxAppointments: org.plan.maxAppointments,
                maxStorageMb: org.plan.maxStorageMb,
              }
            : null,

          subscription: assinatura
            ? {
                id: assinatura.id,
                status: assinatura.status,
                price: assinatura.price,
                nextBillingAt: assinatura.nextBillingAt,
                lastPaidAt: assinatura.lastPaidAt,
                provider: assinatura.provider,
              }
            : null,

          usage: {
            establishments: org.establishments.length,
            activeEstablishments: org.establishments.filter((e) => e.isActive)
              .length,
            users: org.users.length,
            activeUsers: org.users.filter((u) => u.isActive).length,
            clients: totalClientes,
            appointments: totalAgendamentos,
            pendingPayments,
            pendingAmount: arredondar(valorPendente),
            totalFiles: org.storageUsage?.totalFiles ?? 0,
            totalStorageMb: arredondar(org.storageUsage?.totalSizeMb ?? 0),
          },
        }
      })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/admin/empresas]", error)

    return NextResponse.json(
      {
        error: String(error),
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))

    const name = String(body.name ?? "").trim()
    const legalName = String(body.legalName ?? "").trim() || null
    const cnpj = String(body.cnpj ?? "").trim() || null
    const email = String(body.email ?? "").trim() || null
    const phone = String(body.phone ?? "").trim() || null

    const planId = String(body.planId ?? "START").trim()

    const unitName = String(body.unitName ?? name).trim()
    const unitCity = String(body.unitCity ?? "").trim() || null
    const unitState = String(body.unitState ?? "").trim() || null

    const ownerName = String(body.ownerName ?? "").trim()
    const ownerEmail = String(body.ownerEmail ?? "").trim()
    const ownerPhone = String(body.ownerPhone ?? "").trim() || null
    const ownerUsernameRaw = String(body.ownerUsername ?? "").trim()
    const ownerPassword = String(body.ownerPassword ?? "").trim()

    if (!name) {
      return NextResponse.json(
        {
          error: "Informe o nome da empresa.",
        },
        {
          status: 400,
        },
      )
    }

    if (!unitName) {
      return NextResponse.json(
        {
          error: "Informe o nome da primeira unidade.",
        },
        {
          status: 400,
        },
      )
    }

    if (!ownerName) {
      return NextResponse.json(
        {
          error: "Informe o nome do dono/gestor.",
        },
        {
          status: 400,
        },
      )
    }

    if (!ownerEmail) {
      return NextResponse.json(
        {
          error: "Informe o e-mail do dono/gestor.",
        },
        {
          status: 400,
        },
      )
    }

    if (!ownerPassword || ownerPassword.length < 6) {
      return NextResponse.json(
        {
          error: "Informe uma senha inicial com pelo menos 6 caracteres.",
        },
        {
          status: 400,
        },
      )
    }

    const plan = await prisma.planDefinition.findUnique({
      where: {
        id: planId,
      },
    })

    if (!plan) {
      return NextResponse.json(
        {
          error: "Plano não encontrado.",
        },
        {
          status: 404,
        },
      )
    }

    const existingEmail = await prisma.user.findUnique({
      where: {
        email: ownerEmail,
      },
      select: {
        id: true,
      },
    })

    if (existingEmail) {
      return NextResponse.json(
        {
          error: "Já existe um usuário com este e-mail.",
        },
        {
          status: 400,
        },
      )
    }

    if (cnpj) {
      const existingCnpj = await prisma.organization.findUnique({
        where: {
          cnpj,
        },
        select: {
          id: true,
        },
      })

      if (existingCnpj) {
        return NextResponse.json(
          {
            error: "Já existe uma empresa com este CNPJ.",
          },
          {
            status: 400,
          },
        )
      }
    }

    const slug = await gerarSlugUnico(unitName)
    const username = ownerUsernameRaw || (await gerarUsernameUnico(ownerName))
    const passwordHash = await bcrypt.hash(ownerPassword, 10)

    const usernameExiste = await prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
      },
    })

    if (usernameExiste) {
      return NextResponse.json(
        {
          error: "Este nome de usuário já está em uso.",
        },
        {
          status: 400,
        },
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          legalName,
          cnpj,
          email,
          phone,
          ownerName,
          ownerEmail,
          ownerPhone,
          isActive: true,
          isBlocked: false,
          billingStatus: "ACTIVE",
          planId: plan.id,
        },
      })

      const establishment = await tx.establishment.create({
        data: {
          name: unitName,
          slug,
          plan: "START",
          phone,
          email,
          city: unitCity,
          state: unitState,
          cnpj,
          razaoSocial: legalName,
          isActive: true,
          organizationId: organization.id,
        },
      })

      const subscription = await tx.organizationSubscription.create({
        data: {
          organizationId: organization.id,
          planId: plan.id,
          status: "ACTIVE",
          price: plan.priceMonthly,
          billingDay: 5,
          startedAt: new Date(),
          nextBillingAt: proximoVencimentoDia5(),
          provider: "manual",
        },
      })

      const user = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone,
          username,
          passwordHash,
          isFirstLogin: true,
          isActive: true,
          role: "ORG_OWNER",
          employmentType: "CLT",
          organizationId: organization.id,
          establishmentId: establishment.id,
        },
      })

      await tx.storageUsage.upsert({
        where: { organizationId: organization.id },
        create: { organizationId: organization.id, totalFiles: 0, totalSizeMb: 0 },
        update: {},
      })

      return {
        organization,
        establishment,
        subscription,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      }
    })

    return NextResponse.json({
      ok: true,
      empresa: {
        id: result.organization.id,
        name: result.organization.name,
        planId: result.organization.planId,
      },
      unidade: {
        id: result.establishment.id,
        name: result.establishment.name,
        slug: result.establishment.slug,
      },
      usuario: result.user,
      assinatura: {
        id: result.subscription.id,
        price: result.subscription.price,
        nextBillingAt: result.subscription.nextBillingAt,
      },
    })
  } catch (error) {
    console.error("[POST /api/admin/empresas]", error)

    return NextResponse.json(
      {
        error: String(error),
      },
      {
        status: 500,
      },
    )
  }
}