import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const estab = await prisma.establishment.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      phone: true,
      whatsapp: true,
      address: true,
      city: true,
      state: true,
      businessHours: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          iaLicensed: true,
          establishments: {
            where: { isActive: true },
            select: { id: true, name: true, slug: true, city: true, state: true },
            orderBy: { name: "asc" },
          },
        },
      },
      services: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          durationMin: true,
          category: true,
          photoUrl: true,
          availableHome: true,
        },
        orderBy: { name: "asc" },
      },
      users: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          breakBetweenAppts: true,
          attendsHome: true,
          schedules: {
            select: { dayOfWeek: true, startTime: true, endTime: true, isActive: true },
          },
          userServices: { select: { serviceId: true } },
        },
      },
    },
  })

  if (!estab) {
    return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 })
  }

  const logoUrl = estab.logoUrl ?? estab.organization?.logoUrl ?? null
  const iaLicensed = estab.organization?.iaLicensed ?? false

  // Unidades irmãs (mesma org, excluindo a atual)
  const unidades = (estab.organization?.establishments ?? []).filter(u => u.id !== estab.id)

  return NextResponse.json({
    ...estab,
    logoUrl,
    iaLicensed,
    orgName: estab.organization?.name ?? null,
    orgLogoUrl: estab.organization?.logoUrl ?? null,
    unidades,
  })
}
