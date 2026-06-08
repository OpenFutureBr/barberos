import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

const ROLES_PERMITIDOS = ["ADMIN", "ORG_OWNER", "ORG_MANAGER"]

async function verificarAcesso(id: string) {
  const session = await auth()
  const orgId = session?.user?.organizationId
  const role = session?.user?.role
  if (!orgId || !ROLES_PERMITIDOS.includes(role ?? "")) return null
  return prisma.establishment.findFirst({ where: { id, organizationId: orgId } })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const estab = await verificarAcesso(id)
    if (!estab) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(estab)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const existente = await verificarAcesso(id)
    if (!existente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const body = await request.json()

    if (body.slug && body.slug !== existente.slug) {
      const slugEmUso = await prisma.establishment.findUnique({ where: { slug: body.slug } })
      if (slugEmUso) return NextResponse.json({ error: "Slug já em uso por outra unidade" }, { status: 409 })
    }

    const estab = await prisma.establishment.update({
      where: { id },
      data: {
        name: body.name ?? existente.name,
        slug: body.slug || existente.slug,
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
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl || null } : {}),
      },
    })

    if (body.cashbackConfig && typeof body.cashbackConfig === "object") {
      const cfg = body.cashbackConfig as Record<string, number>
      await prisma.cashbackConfig.create({
        data: {
          servicos: Number(cfg.servicos ?? 7),
          domicilio: Number(cfg.domicilio ?? 5),
          produtos: Number(cfg.produtos ?? 3),
          assinaturas: Number(cfg.assinaturas ?? 10),
          establishmentId: id,
        },
      })
    }

    return NextResponse.json(estab)
  } catch (error) {
    console.error("[PUT /api/unidades/[id]]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
