import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { temPermissao } from "@/lib/permissoes"

// GET  /api/org/config  — returns orgConfig JSON
// PUT  /api/org/config  — merges partial update into orgConfig

export async function GET() {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (!temPermissao(session?.user, "unidades") && !temPermissao(session?.user, "configuracoes")) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { orgConfig: true } })
    return NextResponse.json(org?.orgConfig ?? {})
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !["ADMIN", "ORG_OWNER"].includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { orgConfig: true } })
    const current = (org?.orgConfig ?? {}) as Record<string, unknown>
    const updated = { ...current, ...body }

    await prisma.organization.update({ where: { id: orgId }, data: { orgConfig: updated } })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
