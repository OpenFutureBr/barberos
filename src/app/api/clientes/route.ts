import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function GET() {
  try {
    const clientes = await prisma.client.findMany({
      where: { establishmentId: "estab001" },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(clientes)
  } catch (error) {
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
      },
    })
    
    console.log("Cliente criado:", cliente)
    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}