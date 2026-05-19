import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"





export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cliente = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          where: { status: { not: "CANCELLED" as any } },
          include: {
            service: true,
            professional: true,
            payment: { select: { amount: true, method: true } },
          },
          orderBy: { scheduledAt: "desc" },
        },
        loyaltyAccount: {
          include: {
            transactions: { orderBy: { createdAt: "desc" }, take: 20 },
          },
        },
      },
    })

    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })

    // Busca produtos consumidos em cada agendamento
    const apptIds = cliente.appointments.map(a => a.id)
    const movimentos = apptIds.length > 0 ? await prisma.stockMovement.findMany({
      where: { appointmentId: { in: apptIds }, type: "SAIDA" },
      include: { product: { select: { name: true, salePrice: true } } },
    }) : []

    // Agrupa movimentos por appointmentId
    const movPorAppt: Record<string, typeof movimentos> = {}
    for (const m of movimentos) {
      if (!m.appointmentId) continue
      if (!movPorAppt[m.appointmentId]) movPorAppt[m.appointmentId] = []
      movPorAppt[m.appointmentId].push(m)
    }

    const clienteComProdutos = {
      ...cliente,
      appointments: cliente.appointments.map(a => ({
        ...a,
        produtos: movPorAppt[a.id] ?? [],
      })),
    }
    return NextResponse.json(clienteComProdutos)
  } catch (error) {
    console.error("Erro ao buscar cliente:", error)
    return NextResponse.json({ error: "Erro ao buscar cliente" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const cliente = await prisma.client.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        homeZipCode: body.homeZipCode || null,
        homeAddress: body.homeAddress || null,
        homeNumber: body.homeNumber || null,
        homeNeighborhood: body.homeNeighborhood || null,
        homeCity: body.homeCity || null,
      },
    })
    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error)
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erro ao excluir cliente:", error)
    return NextResponse.json({ error: "Erro ao excluir cliente" }, { status: 500 })
  }
}