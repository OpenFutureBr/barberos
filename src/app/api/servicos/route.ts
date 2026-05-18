import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"





export async function GET() {
  try {
    const servicos = await prisma.service.findMany({
      where: { establishmentId: "estab001" },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(servicos)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const servico = await prisma.service.create({
      data: {
        name: body.name,
        category: body.category || null,
        price: parseFloat(body.price),
        durationMin: parseInt(body.durationMin),
        availableHome: body.availableHome ?? false,
        establishmentId: "estab001",
        isActive: body.isActive ?? true,
      },
    })
    return NextResponse.json(servico)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const servico = await prisma.service.update({
      where: { id: body.id },
      data: {
        name: body.name,
        category: body.category || null,
        price: parseFloat(body.price),
        durationMin: parseInt(body.durationMin),
        availableHome: body.availableHome ?? false,
        isActive: body.isActive ?? true,
      },
    })
    return NextResponse.json(servico)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}