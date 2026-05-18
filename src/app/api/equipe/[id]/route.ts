import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"





export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const prof = await prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        employmentType: body.employmentType,
        commissionPct: body.commissionPct ?? null,
        benchFee: body.benchFee ?? null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        pixKey: body.pixKey || null,
        attendsHome: body.attendsHome ?? false,
        homeZipCode: body.homeZipCode || null,
        homeAddress: body.homeAddress || null,
        homeNumber: body.homeNumber || null,
        homeNeighborhood: body.homeNeighborhood || null,
        homeCity: body.homeCity || null,
        admissionDate: body.admissionDate ? new Date(body.admissionDate) : null,
        breakBetweenAppts: body.breakBetweenAppts ? parseInt(body.breakBetweenAppts) : 10,
        isActive: body.isActive ?? true,
        role: body.role || "BARBER_CLT",
      },
    })

    // Atualiza serviços — apaga e recria
    await prisma.userService.deleteMany({ where: { userId: id } })
    if (body.serviceIds?.length) {
      await prisma.userService.createMany({
        data: body.serviceIds.map((sid: string) => ({ userId: id, serviceId: sid })),
        skipDuplicates: true,
      })
    }

    // Atualiza horários — apaga e recria
    await prisma.userSchedule.deleteMany({ where: { userId: id } })
    if (body.schedules?.length) {
      await prisma.userSchedule.createMany({
        data: body.schedules.map((s: any) => ({ userId: id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isActive: s.isActive ?? true })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json(prof)
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error)
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao desativar" }, { status: 500 })
  }
}