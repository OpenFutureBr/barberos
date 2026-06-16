import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// GET — list barbers for this style in current establishment
export async function GET(_req: Request, { params }: { params: Promise<{ galeriaCorteId: string }> }) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const estabId = session?.user?.establishmentId
    if (!orgId || !estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { galeriaCorteId } = await params

    // Find OrgCorte
    const orgCorte = await prisma.orgCorte.findUnique({
      where: { galeriaCorteId_organizationId: { galeriaCorteId, organizationId: orgId } },
    })
    if (!orgCorte) return NextResponse.json([])

    const assigned = await prisma.estabCorteBarbeiro.findMany({
      where: { orgCorteId: orgCorte.id, establishmentId: estabId },
      select: { userId: true },
    })

    return NextResponse.json(assigned.map(a => a.userId))
  } catch (error) {
    console.error("[GET /api/galeria-org/[id]/barbeiros]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PUT — replace barber assignments for this style in current establishment
export async function PUT(request: Request, { params }: { params: Promise<{ galeriaCorteId: string }> }) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const estabId = session?.user?.establishmentId
    if (!orgId || !estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { galeriaCorteId } = await params
    const body = await request.json()
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : []

    // Ensure OrgCorte exists
    const orgCorte = await prisma.orgCorte.upsert({
      where: { galeriaCorteId_organizationId: { galeriaCorteId, organizationId: orgId } },
      create: { galeriaCorteId, organizationId: orgId, isEnabled: true },
      update: {},
    })

    // Replace assignments for this establishment
    await prisma.estabCorteBarbeiro.deleteMany({
      where: { orgCorteId: orgCorte.id, establishmentId: estabId },
    })

    if (userIds.length > 0) {
      await prisma.estabCorteBarbeiro.createMany({
        data: userIds.map(userId => ({
          orgCorteId: orgCorte.id,
          establishmentId: estabId,
          userId,
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({ ok: true, count: userIds.length })
  } catch (error) {
    console.error("[PUT /api/galeria-org/[id]/barbeiros]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
