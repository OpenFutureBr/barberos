import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

async function assertAdmin() {
  const session = await auth()
  if ((session?.user as any)?.role !== "ADMIN") return false
  return true
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

export async function GET() {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  try {
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0,
      23,
      59,
      59,
    )

    const [
      totalEmpresas,
      empresasAtivas,
      empresasBloqueadas,
      assinaturasAtivas,
      faturasPendentes,
      totalUsuarios,
      agendamentosMes,
      storage,
    ] = await Promise.all([
      prisma.organization.count(),

      prisma.organization.count({
        where: {
          isActive: true,
          isBlocked: false,
        },
      }),

      prisma.organization.count({
        where: {
          OR: [{ isBlocked: true }, { billingStatus: "SUSPENDED" }],
        },
      }),

      prisma.organizationSubscription.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          price: true,
        },
      }),

      prisma.organizationInvoice.findMany({
        where: {
          status: {
            in: ["PENDING", "OVERDUE"],
          },
        },
        select: {
          amount: true,
        },
      }),

      prisma.user.count({
        where: {
          isActive: true,
        },
      }),

      prisma.appointment.count({
        where: {
          scheduledAt: {
            gte: inicioMes,
            lte: fimMes,
          },
        },
      }),

      prisma.storageUsage.findMany({
        select: {
          totalFiles: true,
          totalSizeMb: true,
        },
      }),
    ])

    const mrr = assinaturasAtivas.reduce((s, a) => s + a.price, 0)
    const pendente = faturasPendentes.reduce((s, f) => s + f.amount, 0)

    const totalFiles = storage.reduce((s, item) => s + item.totalFiles, 0)
    const totalStorageMb = storage.reduce((s, item) => s + item.totalSizeMb, 0)

    return NextResponse.json({
      totalEmpresas,
      empresasAtivas,
      empresasBloqueadas,
      mrr: arredondar(mrr),
      arr: arredondar(mrr * 12),
      faturasPendentes: faturasPendentes.length,
      valorPendente: arredondar(pendente),
      totalUsuarios,
      agendamentosMes,
      totalFiles,
      totalStorageMb: arredondar(totalStorageMb),
    })
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error)

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
