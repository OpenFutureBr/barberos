import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

async function assertAdmin() {
  const session = await auth()
  if ((session?.user as any)?.role !== "ADMIN") return false
  return true
}

export async function GET() {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const planos = await prisma.planDefinition.findMany({
    orderBy: { priceMonthly: "asc" },
    include: { _count: { select: { organizations: true } } },
  })

  return NextResponse.json(
    planos.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceMonthly: p.priceMonthly,
      maxEstablishments: p.maxEstablishments,
      maxUsers: p.maxUsers,
      maxClients: p.maxClients,
      maxAppointments: p.maxAppointments,
      maxStorageMb: p.maxStorageMb,
      features: p.features as Record<string, boolean> | null,
      isActive: p.isActive,
      createdAt: p.createdAt,
      empresas: p._count.organizations,
    })),
  )
}

export async function POST(req: Request) {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const body = await req.json()
  const { id, name, description, priceMonthly, maxEstablishments, maxUsers,
    maxClients, maxAppointments, maxStorageMb, features } = body

  if (!id || !name || priceMonthly === undefined) {
    return NextResponse.json({ error: "id, name e priceMonthly são obrigatórios." }, { status: 400 })
  }

  const plano = await prisma.planDefinition.create({
    data: {
      id: String(id).toUpperCase().replace(/\s+/g, "_"),
      name,
      description: description || null,
      priceMonthly: Number(priceMonthly),
      maxEstablishments: maxEstablishments ? Number(maxEstablishments) : null,
      maxUsers: maxUsers ? Number(maxUsers) : null,
      maxClients: maxClients ? Number(maxClients) : null,
      maxAppointments: maxAppointments ? Number(maxAppointments) : null,
      maxStorageMb: maxStorageMb ? Number(maxStorageMb) : null,
      features: features || null,
      isActive: true,
    },
  })

  return NextResponse.json(plano, { status: 201 })
}
