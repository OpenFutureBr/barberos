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
      organization: { select: { logoUrl: true, iaLicensed: true } },
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

  // Resolve logo: unit-specific > org-level
  const logoUrl = estab.logoUrl ?? estab.organization?.logoUrl ?? null
  const iaLicensed = estab.organization?.iaLicensed ?? false
  return NextResponse.json({ ...estab, logoUrl, iaLicensed })
}
