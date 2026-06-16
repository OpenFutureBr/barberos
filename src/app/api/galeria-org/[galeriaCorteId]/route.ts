import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// POST — enable style for org
export async function POST(_req: Request, { params }: { params: Promise<{ galeriaCorteId: string }> }) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { galeriaCorteId } = await params
    const orgCorte = await prisma.orgCorte.upsert({
      where: { galeriaCorteId_organizationId: { galeriaCorteId, organizationId: orgId } },
      create: { galeriaCorteId, organizationId: orgId, isEnabled: true },
      update: { isEnabled: true },
    })
    return NextResponse.json(orgCorte)
  } catch (error) {
    console.error("[POST /api/galeria-org/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE — disable style for org
export async function DELETE(_req: Request, { params }: { params: Promise<{ galeriaCorteId: string }> }) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { galeriaCorteId } = await params
    await prisma.orgCorte.updateMany({
      where: { galeriaCorteId, organizationId: orgId },
      data: { isEnabled: false },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[DELETE /api/galeria-org/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PUT — update custom name/photo
export async function PUT(request: Request, { params }: { params: Promise<{ galeriaCorteId: string }> }) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { galeriaCorteId } = await params
    const body = await request.json()
    const orgCorte = await prisma.orgCorte.upsert({
      where: { galeriaCorteId_organizationId: { galeriaCorteId, organizationId: orgId } },
      create: { galeriaCorteId, organizationId: orgId, isEnabled: true, customName: body.customName || null },
      update: { customName: body.customName !== undefined ? (body.customName || null) : undefined },
    })
    return NextResponse.json(orgCorte)
  } catch (error) {
    console.error("[PUT /api/galeria-org/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
