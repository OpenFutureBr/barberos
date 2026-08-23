import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function PUT(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "domicilio")
    if (bloqueio) return bloqueio

    const body = await request.json()

    const areas: string[] = Array.isArray(body.serviceZoneAreas)
      ? body.serviceZoneAreas.map((s: string) => s.trim()).filter(Boolean)
      : typeof body.serviceZoneAreas === "string"
        ? body.serviceZoneAreas.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : []

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        attendsHome: Boolean(body.attendsHome),
        serviceZoneKm: body.serviceZoneKm != null ? parseFloat(body.serviceZoneKm) : null,
        serviceZoneAreas: areas,
      },
      select: { id: true, attendsHome: true, serviceZoneKm: true, serviceZoneAreas: true, bookingSlug: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[PUT /api/domicilio/zona]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
