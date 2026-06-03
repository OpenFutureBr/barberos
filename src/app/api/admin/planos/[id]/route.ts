import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()

  const { name, description, priceMonthly, maxEstablishments, maxUsers,
    maxClients, maxAppointments, maxStorageMb, features, isActive } = body

  const plano = await prisma.planDefinition.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(priceMonthly !== undefined && { priceMonthly: Number(priceMonthly) }),
      ...(maxEstablishments !== undefined && { maxEstablishments: maxEstablishments ? Number(maxEstablishments) : null }),
      ...(maxUsers !== undefined && { maxUsers: maxUsers ? Number(maxUsers) : null }),
      ...(maxClients !== undefined && { maxClients: maxClients ? Number(maxClients) : null }),
      ...(maxAppointments !== undefined && { maxAppointments: maxAppointments ? Number(maxAppointments) : null }),
      ...(maxStorageMb !== undefined && { maxStorageMb: maxStorageMb ? Number(maxStorageMb) : null }),
      ...(features !== undefined && { features }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  })

  return NextResponse.json(plano)
}
