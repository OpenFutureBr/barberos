import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Modo simples: apenas id, name, phone — para comboboxes
    if (searchParams.get("modo") === "simples") {
      const clientes = await prisma.client.findMany({
        where: { establishmentId: "estab001", isActive: true },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
      })
      return NextResponse.json(clientes)
    }

    // Paginação
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const perPage = [10, 30, 50].includes(parseInt(searchParams.get("perPage") ?? "30"))
      ? parseInt(searchParams.get("perPage")!)
      : 30
    const busca = searchParams.get("busca") ?? ""

    const where: any = {
      establishmentId: "estab001",
      isActive: true,
      ...(busca ? {
        OR: [
          { name: { contains: busca, mode: "insensitive" } },
          { phone: { contains: busca } },
        ],
      } : {}),
    }

    // Uma única query leve — favoritoCorte e favoritoProduto já estão no registro
    const [total, clientes] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ])

    return NextResponse.json({
      clientes,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    })
  } catch (error) {
    console.error("Erro ao buscar clientes:", error)
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
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
    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
