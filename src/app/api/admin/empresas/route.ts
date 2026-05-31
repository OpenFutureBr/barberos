import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

export async function GET() {
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

    const result = await Promise.all(
      organizations.map(async (org) => {
        const establishmentIds = org.establishments.map((e) => e.id)

        const [totalClientes, totalAgendamentos, pagamentosPendentes] =
          establishmentIds.length > 0
            ? await Promise.all([
                prisma.client.count({
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
                    amount: true,
                  },
                }),
              ])
            : [0, 0, [] as { amount: number }[]]

        const valorPendente = pagamentosPendentes.reduce(
          (s, p) => s + p.amount,
          0,
        )

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
            pendingPayments: pagamentosPendentes.length,
            pendingAmount: arredondar(valorPendente),
            totalFiles: org.storageUsage?.totalFiles ?? 0,
            totalStorageMb: arredondar(org.storageUsage?.totalSizeMb ?? 0),
          },
        }
      }),
    )

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