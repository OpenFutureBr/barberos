import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/org/info — basic org info including logoUrl
export async function GET() {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, logoUrl: true },
    })

    return NextResponse.json(org ?? {})
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
