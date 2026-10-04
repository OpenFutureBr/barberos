import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { salvarTemplates } from "@/lib/permissoes-templates"

// Platform-wide role permission templates (organizationId = null)
// Only ADMIN can read/write these

export async function GET() {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const templates = await prisma.rolePermissionTemplate.findMany({
      where: { organizationId: null },
      orderBy: [{ role: "asc" }, { resource: "asc" }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body: Array<{ role: string; resource: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = await request.json()

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 })
    }

    const updated = await salvarTemplates(null, body)

    return NextResponse.json({ updated })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
