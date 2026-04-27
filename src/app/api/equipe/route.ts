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
    const profissionais = await prisma.user.findMany({
      where: { establishmentId: "estab001" },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(profissionais)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const profissional = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        role: body.role || "BARBER_CLT",
        employmentType: body.employmentType || "CLT",
        commissionPct: body.commissionPct ? parseFloat(body.commissionPct) : null,
        benchFee: body.benchFee ? parseFloat(body.benchFee) : null,
        establishmentId: "estab001",
        isActive: true,
      },
    })
    return NextResponse.json(profissional)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}