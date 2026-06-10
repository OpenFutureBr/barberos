import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  const estabId = session?.user?.establishmentId
  if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const estab = await prisma.establishment.findUnique({
    where: { id: estabId },
    select: { caixaConfig: true },
  })

  const config = (estab?.caixaConfig as any) ?? {}
  return NextResponse.json({ categorias: config.categorias ?? [] })
}

export async function PUT(req: Request) {
  const session = await auth()
  const estabId = session?.user?.establishmentId
  if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await req.json()
  const categorias = Array.isArray(body.categorias) ? body.categorias : []

  const estab = await prisma.establishment.findUnique({
    where: { id: estabId },
    select: { caixaConfig: true },
  })
  const config = (estab?.caixaConfig as any) ?? {}

  await prisma.establishment.update({
    where: { id: estabId },
    data: { caixaConfig: { ...config, categorias } },
  })

  return NextResponse.json({ ok: true })
}
