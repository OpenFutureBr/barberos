import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Returns all platform styles + org selection status
export async function GET() {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const [cortes, orgCortes] = await Promise.all([
      prisma.galeriaCorte.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.orgCorte.findMany({
        where: { organizationId: orgId },
        include: {
          barbeiros: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
      }),
    ])

    const orgMap = new Map(orgCortes.map(oc => [oc.galeriaCorteId, oc]))

    const result = cortes.map(c => {
      const orgCorte = orgMap.get(c.id)
      return {
        ...c,
        orgCorte: orgCorte ? {
          id: orgCorte.id,
          isEnabled: orgCorte.isEnabled,
          customName: orgCorte.customName,
          customPhotoUrl: orgCorte.customPhotoUrl,
          barbeiros: orgCorte.barbeiros,
        } : null,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/galeria-org]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
