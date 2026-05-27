import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const permissoes = await prisma.userPermission.findMany({ where: { userId: id } })
  return NextResponse.json(permissoes)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body: { resource: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[] = await req.json()

  // Upsert em paralelo para cada recurso
  await Promise.all(
    body.map(p =>
      prisma.userPermission.upsert({
        where: { userId_resource: { userId: id, resource: p.resource } },
        create: { userId: id, resource: p.resource, canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete },
        update: { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
