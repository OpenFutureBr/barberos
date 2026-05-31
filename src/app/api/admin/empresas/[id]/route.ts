import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const organization = await prisma.organization.findUnique({
      where: {
        id,
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            priceMonthly: true,
            maxEstablishments: true,
            maxUsers: true,
            maxClients: true,
            maxAppointments: true,
            maxStorageMb: true,
            features: true,
            isActive: true,
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
            billingDay: true,
            startedAt: true,
            nextBillingAt: true,
            lastPaidAt: true,
            cancelledAt: true,
            provider: true,
            externalId: true,
            createdAt: true,
          },
        },
        invoices: {
          orderBy: {
            dueDate: "desc",
          },
          take: 12,
          select: {
            id: true,
            status: true,
            amount: true,
            dueDate: true,
            paidAt: true,
            cancelledAt: true,
            referenceMonth: true,
            provider: true,
            notes: true,
            createdAt: true,
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
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            name: true,
            slug: true,
            cnpj: true,
            razaoSocial: true,
            phone: true,
            email: true,
            city: true,
            state: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        users: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
            employmentType: true,
            phone: true,
            isActive: true,
            establishmentId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        usageMetrics: {
          orderBy: {
            referenceMonth: "desc",
          },
          take: 50,
          select: {
            id: true,
            establishmentId: true,
            metric: true,
            value: true,
            referenceMonth: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        {
          error: "Empresa não encontrada.",
        },
        {
          status: 404,
        },
      )
    }

    const establishmentIds = organization.establishments.map((e) => e.id)

    const [
      totalClientes,
      clientesAtivos,
      totalAgendamentos,
      agendamentosMes,
      pagamentosPendentes,
      totalProdutos,
      totalServicos,
      totalCaixas,
    ] =
      establishmentIds.length > 0
        ? await Promise.all([
            prisma.client.count({
              where: {
                establishmentId: {
                  in: establishmentIds,
                },
              },
            }),

            prisma.client.count({
              where: {
                establishmentId: {
                  in: establishmentIds,
                },
                isActive: true,
              },
            }),

            prisma.appointment.count({
              where: {
                establishmentId: {
                  in: establishmentIds,
                },
              },
            }),

            prisma.appointment.count({
              where: {
                establishmentId: {
                  in: establishmentIds,
                },
                scheduledAt: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  lte: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + 1,
                    0,
                    23,
                    59,
                    59,
                  ),
                },
              },
            }),

            prisma.payment.findMany({
              where: {
                status: "PENDING",
                appointment: {
                  establishmentId: {
                    in: establishmentIds,
                  },
                },
              },
              select: {
                id: true,
                amount: true,
                dueDate: true,
                createdAt: true,
                appointment: {
                  select: {
                    id: true,
                    scheduledAt: true,
                    client: {
                      select: {
                        name: true,
                        phone: true,
                      },
                    },
                    service: {
                      select: {
                        name: true,
                      },
                    },
                    establishment: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                dueDate: "asc",
              },
            }),

            prisma.product.count({
              where: {
                establishmentId: {
                  in: establishmentIds,
                },
              },
            }),

            prisma.service.count({
              where: {
                establishmentId: {
                  in: establishmentIds,
                },
              },
            }),

            prisma.cashRegister.count({
              where: {
                establishmentId: {
                  in: establishmentIds,
                },
              },
            }),
          ])
        : [
            0,
            0,
            0,
            0,
            [] as {
              id: string
              amount: number
              dueDate: Date | null
              createdAt: Date
              appointment: {
                id: string
                scheduledAt: Date
                client: {
                  name: string
                  phone: string
                }
                service: {
                  name: string
                }
                establishment: {
                  name: string
                }
              }
            }[],
            0,
            0,
            0,
          ]

    const valorPendente = pagamentosPendentes.reduce((s, p) => {
      return s + p.amount
    }, 0)

    const subscription = organization.subscriptions[0] ?? null

    const invoicesResumo = organization.invoices.reduce(
      (acc, invoice) => {
        if (invoice.status === "PAID") {
          acc.pagas += 1
          acc.valorPago += invoice.amount
        }

        if (invoice.status === "PENDING" || invoice.status === "OVERDUE") {
          acc.abertas += 1
          acc.valorAberto += invoice.amount
        }

        if (invoice.status === "OVERDUE") {
          acc.atrasadas += 1
          acc.valorAtrasado += invoice.amount
        }

        return acc
      },
      {
        pagas: 0,
        abertas: 0,
        atrasadas: 0,
        valorPago: 0,
        valorAberto: 0,
        valorAtrasado: 0,
      },
    )

    return NextResponse.json({
      empresa: {
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName,
        cnpj: organization.cnpj,
        email: organization.email,
        phone: organization.phone,
        ownerName: organization.ownerName,
        ownerEmail: organization.ownerEmail,
        ownerPhone: organization.ownerPhone,
        isActive: organization.isActive,
        isBlocked: organization.isBlocked,
        billingStatus: organization.billingStatus,
        trialEndsAt: organization.trialEndsAt,
        lastAccessAt: organization.lastAccessAt,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        plan: organization.plan,
        subscription,
        storageUsage: organization.storageUsage,
      },

      resumo: {
        unidades: organization.establishments.length,
        unidadesAtivas: organization.establishments.filter((e) => e.isActive).length,
        usuarios: organization.users.length,
        usuariosAtivos: organization.users.filter((u) => u.isActive).length,
        clientes: totalClientes,
        clientesAtivos,
        agendamentos: totalAgendamentos,
        agendamentosMes,
        pagamentosPendentes: pagamentosPendentes.length,
        valorPendente: arredondar(valorPendente),
        produtos: totalProdutos,
        servicos: totalServicos,
        caixas: totalCaixas,
        totalFiles: organization.storageUsage?.totalFiles ?? 0,
        totalStorageMb: arredondar(organization.storageUsage?.totalSizeMb ?? 0),
        invoices: {
          pagas: invoicesResumo.pagas,
          abertas: invoicesResumo.abertas,
          atrasadas: invoicesResumo.atrasadas,
          valorPago: arredondar(invoicesResumo.valorPago),
          valorAberto: arredondar(invoicesResumo.valorAberto),
          valorAtrasado: arredondar(invoicesResumo.valorAtrasado),
        },
      },

      unidades: organization.establishments,

      usuarios: organization.users.map((user) => {
        const unidade = organization.establishments.find(
          (e) => e.id === user.establishmentId,
        )

        return {
          ...user,
          establishmentName: unidade?.name ?? null,
        }
      }),

      faturas: organization.invoices,

      metricas: organization.usageMetrics,

      pendencias: pagamentosPendentes.map((p) => ({
        id: p.id,
        amount: p.amount,
        dueDate: p.dueDate,
        createdAt: p.createdAt,
        appointmentId: p.appointment.id,
        scheduledAt: p.appointment.scheduledAt,
        client: p.appointment.client,
        service: p.appointment.service,
        establishment: p.appointment.establishment,
      })),
    })
  } catch (error) {
    console.error("[GET /api/admin/empresas/[id]]", error)

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

  export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const action = String(body.action ?? "")

    const organization = await prisma.organization.findUnique({
      where: {
        id,
      },
      include: {
        subscriptions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        {
          error: "Empresa não encontrada.",
        },
        {
          status: 404,
        },
      )
    }

    if (action === "toggle-block") {
      const shouldBlock = !organization.isBlocked

      const updated = await prisma.organization.update({
        where: {
          id,
        },
        data: {
          isBlocked: shouldBlock,
          billingStatus: shouldBlock ? "SUSPENDED" : "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          isBlocked: true,
          billingStatus: true,
        },
      })

      return NextResponse.json({
        ok: true,
        action,
        organization: updated,
      })
    }

    if (action === "change-plan") {
      const planId = String(body.planId ?? "")

      if (!planId) {
        return NextResponse.json(
          {
            error: "Plano não informado.",
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

      const subscription = organization.subscriptions[0] ?? null

      await prisma.$transaction(async (tx) => {
        await tx.organization.update({
          where: {
            id,
          },
          data: {
            planId: plan.id,
            billingStatus: organization.isBlocked ? "SUSPENDED" : "ACTIVE",
          },
        })

        if (subscription) {
          await tx.organizationSubscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              planId: plan.id,
              price: plan.priceMonthly,
              status: organization.isBlocked ? "SUSPENDED" : "ACTIVE",
            },
          })
        } else {
          await tx.organizationSubscription.create({
            data: {
              organizationId: id,
              planId: plan.id,
              status: organization.isBlocked ? "SUSPENDED" : "ACTIVE",
              price: plan.priceMonthly,
              billingDay: 5,
              startedAt: new Date(),
              nextBillingAt: new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                5,
                12,
                0,
                0,
              ),
              provider: "manual",
            },
          })
        }
      })

      return NextResponse.json({
        ok: true,
        action,
        plan: {
          id: plan.id,
          name: plan.name,
          priceMonthly: plan.priceMonthly,
        },
      })
    }

    if (action === "mark-invoice-paid") {
      const invoiceId = String(body.invoiceId ?? "")

      if (!invoiceId) {
        return NextResponse.json(
          {
            error: "Fatura não informada.",
          },
          {
            status: 400,
          },
        )
      }

      const invoice = await prisma.organizationInvoice.findFirst({
        where: {
          id: invoiceId,
          organizationId: id,
        },
      })

      if (!invoice) {
        return NextResponse.json(
          {
            error: "Fatura não encontrada.",
          },
          {
            status: 404,
          },
        )
      }

      await prisma.$transaction(async (tx) => {
        await tx.organizationInvoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        })

        await tx.organization.update({
          where: {
            id,
          },
          data: {
            billingStatus: organization.isBlocked ? "SUSPENDED" : "ACTIVE",
          },
        })

        const subscription = organization.subscriptions[0]

        if (subscription) {
          await tx.organizationSubscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              status: organization.isBlocked ? "SUSPENDED" : "ACTIVE",
              lastPaidAt: new Date(),
              nextBillingAt: new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                subscription.billingDay,
                12,
                0,
                0,
              ),
            },
          })
        }
      })

      return NextResponse.json({
        ok: true,
        action,
        invoiceId,
      })
    }

    if (action === "create-invoice") {
      const amount = Number(body.amount ?? 0)
      const referenceMonth = String(body.referenceMonth ?? "")
      const dueDateRaw = body.dueDate ? String(body.dueDate) : ""

      if (!amount || amount <= 0) {
        return NextResponse.json(
          {
            error: "Valor da fatura inválido.",
          },
          {
            status: 400,
          },
        )
      }

      if (!referenceMonth) {
        return NextResponse.json(
          {
            error: "Informe o mês de referência.",
          },
          {
            status: 400,
          },
        )
      }

      if (!dueDateRaw) {
        return NextResponse.json(
          {
            error: "Informe a data de vencimento.",
          },
          {
            status: 400,
          },
        )
      }

      const invoice = await prisma.organizationInvoice.create({
        data: {
          organizationId: id,
          status: "PENDING",
          amount,
          referenceMonth,
          dueDate: new Date(`${dueDateRaw}T12:00:00`),
          provider: "manual",
        },
      })

      return NextResponse.json({
        ok: true,
        action,
        invoice,
      })
    }

    return NextResponse.json(
      {
        error: "Ação inválida.",
      },
      {
        status: 400,
      },
    )
    } catch (error) {
      console.error("[PATCH /api/admin/empresas/[id]]", error)

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