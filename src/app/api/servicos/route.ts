import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"





export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const servicos = await prisma.service.findMany({
      where: { establishmentId: estabId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(servicos, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await request.json()
    const servico = await prisma.service.create({
      data: {
        name: body.name,
        category: body.category || null,
        price: parseFloat(body.price),
        durationMin: parseInt(body.durationMin),
        availableHome: body.availableHome ?? false,
        establishmentId: estabId,
        isActive: body.isActive ?? true,
        photoUrl: body.photoUrl || null,
      },
    })
    return NextResponse.json(servico)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await request.json()

    const existente = await prisma.service.findFirst({ where: { id: body.id, establishmentId: estabId }, select: { id: true } })
    if (!existente) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 })

    const servico = await prisma.service.update({
      where: { id: body.id },
      data: {
        name: body.name,
        category: body.category || null,
        price: parseFloat(body.price),
        durationMin: parseInt(body.durationMin),
        availableHome: body.availableHome ?? false,
        isActive: body.isActive ?? true,
        ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl || null } : {}),
      },
    })
    return NextResponse.json(servico)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}