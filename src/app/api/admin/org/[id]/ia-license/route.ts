import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const { id } = await params
  const { iaLicensed } = await req.json().catch(() => ({}))

  const org = await prisma.organization.update({
    where: { id },
    data: { iaLicensed: !!iaLicensed },
    select: { id: true, iaLicensed: true },
  })

  return NextResponse.json(org)
}
