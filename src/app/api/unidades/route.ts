import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

const ROLES_PERMITIDOS = ["ADMIN", "ORG_OWNER", "ORG_MANAGER"]

export async function GET() {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !ROLES_PERMITIDOS.includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)

    const establishments = await prisma.establishment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            clients: true,
            appointments: {
              where: {
                scheduledAt: { gte: hoje, lt: amanha },
                status: { notIn: ["CANCELLED", "NO_SHOW"] as any },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(establishments)
  } catch (error) {
    console.error("[GET /api/unidades]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !ROLES_PERMITIDOS.includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })
    }

    let slug = (body.name as string)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    const existe = await prisma.establishment.findUnique({ where: { slug } })
    if (existe) slug = `${slug}-${Date.now().toString(36)}`

    const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    const defaultHours = DIAS.map((label, i) => ({
      dayOfWeek: i, label,
      isOpen: i >= 1 && i <= 6,
      startTime: "09:00", endTime: "19:00", markup: 0,
    }))

    const estab = await prisma.establishment.create({
      data: {
        name: body.name.trim(),
        slug,
        organizationId: orgId,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        businessHours: defaultHours as any,
        cashbackConfig: { servicos: 7, domicilio: 5, produtos: 3, assinaturas: 10 } as any,
      },
    })

    return NextResponse.json(estab, { status: 201 })
  } catch (error) {
    console.error("[POST /api/unidades]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
