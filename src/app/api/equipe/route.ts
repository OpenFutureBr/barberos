import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"





export async function GET() {
  try {
    const profissionais = await prisma.user.findMany({
      where: { establishmentId: "estab001" },
      include: {
        schedules: true,
        userServices: { include: { service: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(profissionais, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const profissional = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        role: body.role || "BARBER_CLT",
        employmentType: body.employmentType || "CLT",
        commissionPct: body.commissionPct ? parseFloat(body.commissionPct) : null,
        benchFee: body.benchFee ? parseFloat(body.benchFee) : null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        pixKey: body.pixKey || null,
        attendsHome: body.attendsHome ?? false,
        homeZipCode: body.homeZipCode || null,
        homeAddress: body.homeAddress || null,
        homeNumber: body.homeNumber || null,
        homeNeighborhood: body.homeNeighborhood || null,
        homeCity: body.homeCity || null,
        admissionDate: body.admissionDate ? new Date(body.admissionDate) : new Date(),
        breakBetweenAppts: body.breakBetweenAppts ? parseInt(body.breakBetweenAppts) : 10,
        establishmentId: "estab001",
        isActive: true,
      },
    })
    // Salva serviços vinculados
    if (body.serviceIds?.length) {
      await prisma.userService.createMany({
        data: body.serviceIds.map((sid: string) => ({ userId: profissional.id, serviceId: sid })),
        skipDuplicates: true,
      })
    }
    // Salva horários
    if (body.schedules?.length) {
      await prisma.userSchedule.createMany({
        data: body.schedules.map((s: any) => ({ userId: profissional.id, ...s })),
        skipDuplicates: true,
      })
    }
    return NextResponse.json(profissional)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}