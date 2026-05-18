import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const estab = await prisma.establishment.findUnique({ where: { id: "estab001" } })
    return NextResponse.json(estab)
  } catch (error) {
    console.error("[GET /api/configuracoes]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const estab = await prisma.establishment.update({
      where: { id: "estab001" },
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zipCode: body.zipCode || null,
        pixKey: body.pixKey || null,
        whatsapp: body.whatsapp || null,
        instagram: body.instagram || null,
        inauguratedAt: body.inauguratedAt ? new Date(body.inauguratedAt) : null,
        cnpj: body.cnpj || null,
        razaoSocial: body.razaoSocial || null,
        inscricaoMunicipal: body.inscricaoMunicipal || null,
        regimeTributario: body.regimeTributario || null,
        businessHours: body.businessHours ?? undefined,
        ...(body.logoUrl ? { logoUrl: body.logoUrl } : {}),
      },
    })
    return NextResponse.json(estab)
  } catch (error) {
    console.error("[PUT /api/configuracoes]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
