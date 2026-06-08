import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET  /api/unidades/[id]/servicos
// Returns all org services with isEnabled flag for this unit
// PUT  /api/unidades/[id]/servicos
// Body: [{ serviceId, isEnabled }]

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: estabId } = await params
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !["ADMIN", "ORG_OWNER", "ORG_MANAGER"].includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    // Verify establishment belongs to org
    const estab = await prisma.establishment.findFirst({ where: { id: estabId, organizationId: orgId }, select: { id: true } })
    if (!estab) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 })

    // All services in the org (from all establishments in this org)
    const [services, units] = await Promise.all([
      prisma.service.findMany({
        where: { establishment: { organizationId: orgId }, isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
        select: { id: true, name: true, price: true, durationMin: true, category: true, establishmentId: true },
      }),
      prisma.serviceUnit.findMany({
        where: { establishmentId: estabId },
        select: { serviceId: true, isEnabled: true },
      }),
    ])

    const unitMap = new Map(units.map(u => [u.serviceId, u.isEnabled]))

    // A service is enabled by default if it belongs to this unit; disabled by default for other units
    const result = services.map(s => ({
      ...s,
      isEnabled: unitMap.has(s.id)
        ? unitMap.get(s.id)!
        : s.establishmentId === estabId, // own services default on, others default off
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: estabId } = await params
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !["ADMIN", "ORG_OWNER", "ORG_MANAGER"].includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const estab = await prisma.establishment.findFirst({ where: { id: estabId, organizationId: orgId }, select: { id: true } })
    if (!estab) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 })

    const body: { serviceId: string; isEnabled: boolean }[] = await request.json()

    await Promise.all(
      body.map(async ({ serviceId, isEnabled }) => {
        const existing = await prisma.serviceUnit.findFirst({ where: { serviceId, establishmentId: estabId }, select: { id: true } })
        if (existing) {
          return prisma.serviceUnit.update({ where: { id: existing.id }, data: { isEnabled } })
        }
        return prisma.serviceUnit.create({ data: { serviceId, establishmentId: estabId, isEnabled } })
      })
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
