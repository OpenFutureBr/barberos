import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"





export async function GET() {
  try {
    const [clientes, appts, movimentos] = await Promise.all([
      prisma.client.findMany({
        where: { establishmentId: "estab001", isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      // Appointments só para mapear clientId → appointmentId
      prisma.appointment.findMany({
        where: { establishmentId: "estab001" },
        select: { id: true, clientId: true },
      }),
      // Todos os movimentos SAIDA com produto
      prisma.stockMovement.findMany({
        where: { type: "SAIDA", appointmentId: { not: null } },
        select: { appointmentId: true, quantity: true, product: { select: { name: true } } },
      }),
    ])

    // Mapa appointmentId → clientId
    const apptCliente: Record<string, string> = {}
    for (const a of appts) apptCliente[a.id] = a.clientId

    // Agrupa: clientId → produtoNome → quantidade total
    const qtdPorCliente: Record<string, Record<string, number>> = {}
    for (const m of movimentos) {
      if (!m.appointmentId || !m.product?.name) continue
      const clientId = apptCliente[m.appointmentId]
      if (!clientId) continue
      if (!qtdPorCliente[clientId]) qtdPorCliente[clientId] = {}
      const nome = m.product.name
      qtdPorCliente[clientId][nome] = (qtdPorCliente[clientId][nome] ?? 0) + m.quantity
    }

    // Produto favorito por cliente (maior qtd; empate → alfabético)
    const produtoFavorito: Record<string, string> = {}
    for (const [clientId, prods] of Object.entries(qtdPorCliente)) {
      const sorted = Object.entries(prods).sort((a, b) =>
        b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "pt-BR")
      )
      if (sorted.length > 0) produtoFavorito[clientId] = sorted[0][0]
    }

    const resultado = clientes.map(c => ({
      ...c,
      produtoFavorito: produtoFavorito[c.id] ?? null,
    }))

    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Erro ao buscar clientes:", error)
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Criando cliente:", body)

    const cliente = await prisma.client.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        establishmentId: "estab001",
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        homeZipCode: body.homeZipCode || null,
        homeAddress: body.homeAddress || null,
        homeNumber: body.homeNumber || null,
        homeNeighborhood: body.homeNeighborhood || null,
        homeCity: body.homeCity || null,
      },
    })

    console.log("Cliente criado:", cliente)
    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}