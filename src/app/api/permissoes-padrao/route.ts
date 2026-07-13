import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Org-scoped role permission templates
// ORG_OWNER can read/write for their org; ORG_MANAGER can read only
// GET also merges in platform defaults so the UI always shows a complete matrix

export async function GET() {
  try {
    const session = await auth()
    const role = session?.user?.role
    const orgId = session?.user?.organizationId

    if (!orgId || (role !== "ORG_OWNER" && role !== "ORG_MANAGER" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Load both platform defaults and org overrides
    const [platformDefaults, orgOverrides, contagemPorRole] = await Promise.all([
      prisma.rolePermissionTemplate.findMany({
        where: { organizationId: null },
        orderBy: [{ role: "asc" }, { resource: "asc" }],
      }),
      prisma.rolePermissionTemplate.findMany({
        where: { organizationId: orgId },
        orderBy: [{ role: "asc" }, { resource: "asc" }],
      }),
      prisma.user.groupBy({
        by: ["role"],
        where: { organizationId: orgId, isActive: true },
        _count: { _all: true },
      }),
    ])

    // Merge: org overrides take priority
    const merged = new Map<string, typeof platformDefaults[number]>()
    for (const t of platformDefaults) {
      merged.set(`${t.role}::${t.resource}`, t)
    }
    for (const t of orgOverrides) {
      merged.set(`${t.role}::${t.resource}`, t)
    }

    // BARBER_CLT/BARBER_MEI/AUTONOMO contam juntos como "PROFESSIONAL" — são
    // todos profissionais de corte, só o repasse muda (ver auth.ts).
    const userCounts: Record<string, number> = {}
    for (const c of contagemPorRole) {
      const chave = ["BARBER_CLT", "BARBER_MEI", "AUTONOMO"].includes(c.role) ? "PROFESSIONAL" : c.role
      userCounts[chave] = (userCounts[chave] ?? 0) + c._count._all
    }

    return NextResponse.json({
      templates: Array.from(merged.values()),
      hasOrgOverrides: orgOverrides.length > 0,
      userCounts,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    const role = session?.user?.role
    const orgId = session?.user?.organizationId

    if (!orgId || role !== "ORG_OWNER") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body: Array<{ role: string; resource: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = await request.json()

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 })
    }

    // Block ORG_OWNER from setting permissions for ORG_OWNER or ADMIN roles
    const filtered = body.filter(t => t.role !== "ADMIN" && t.role !== "ORG_OWNER")

    const results = await Promise.all(
      filtered.map(async ({ role: r, resource, canView, canCreate, canEdit, canDelete }) => {
        const existing = await prisma.rolePermissionTemplate.findFirst({
          where: { role: r, resource, organizationId: orgId },
          select: { id: true },
        })
        if (existing) {
          return prisma.rolePermissionTemplate.update({
            where: { id: existing.id },
            data: { canView, canCreate, canEdit, canDelete },
          })
        }
        return prisma.rolePermissionTemplate.create({
          data: { role: r, resource, canView, canCreate, canEdit, canDelete, organizationId: orgId },
        })
      })
    )

    return NextResponse.json({ updated: results.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
