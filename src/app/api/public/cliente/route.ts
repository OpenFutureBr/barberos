import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get("phone")?.replace(/\D/g, "") ?? ""
  const estabId = searchParams.get("estabId") ?? ""

  if (!phone || !estabId) return NextResponse.json(null)

  const cliente = await prisma.client.findFirst({
    where: {
      establishmentId: estabId,
      phone: { contains: phone },
    },
    select: { id: true, name: true, phone: true, email: true },
  })

  return NextResponse.json(cliente)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { name, phone, email, estabId } = body

  if (!name?.trim() || !phone?.trim() || !estabId) {
    return NextResponse.json({ error: "Nome, telefone e estabelecimento são obrigatórios" }, { status: 400 })
  }

  const existente = await prisma.client.findFirst({
    where: { establishmentId: estabId, phone: { contains: phone.replace(/\D/g, "") } },
    select: { id: true, name: true, phone: true },
  })

  if (existente) return NextResponse.json(existente)

  const cliente = await prisma.client.create({
    data: {
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      establishmentId: estabId,
    },
    select: { id: true, name: true, phone: true },
  })

  return NextResponse.json(cliente, { status: 201 })
}
