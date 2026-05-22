import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const estab = await prisma.establishment.findUnique({ where: { id: "estab001" } })
    return NextResponse.json(estab, {
      headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=300" },
    })
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
        cashbackConfig: body.cashbackConfig ?? undefined,
        painelConfig: body.painelConfig ?? undefined,
        ...(body.logoUrl ? { logoUrl: body.logoUrl } : {}),
      },
    })

    // Grava versão histórica na tabela dedicada sempre que o cashback mudar
    if (body.cashbackConfig && typeof body.cashbackConfig === "object") {
      const cfg = body.cashbackConfig as Record<string, number>
      await prisma.cashbackConfig.create({
        data: {
          servicos:    Number(cfg.servicos    ?? 7),
          domicilio:   Number(cfg.domicilio   ?? 5),
          produtos:    Number(cfg.produtos    ?? 3),
          assinaturas: Number(cfg.assinaturas ?? 10),
          establishmentId: "estab001",
        },
      })
    }

    return NextResponse.json(estab)
  } catch (error) {
    console.error("[PUT /api/configuracoes]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
