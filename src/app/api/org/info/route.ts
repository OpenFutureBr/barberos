import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { temPermissao } from "@/lib/permissoes"

// GET /api/org/info — basic org info including logoUrl
export async function GET() {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (!temPermissao(session?.user, "unidades") && !temPermissao(session?.user, "configuracoes")) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, logoUrl: true },
    })

    return NextResponse.json(org ?? {})
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
