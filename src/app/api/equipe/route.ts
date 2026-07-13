import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth, gerarUsername } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function GET() {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const profissionais = await prisma.user.findMany({
      where: { establishmentId: estabId },
      include: {
        schedules: true,
        // Só id/nome do serviço são usados na tela de equipe — evita trazer
        // preço, duração, foto etc. de cada serviço vinculado ao profissional.
        userServices: { select: { serviceId: true, service: { select: { id: true, name: true } } } },
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
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "equipe")
    if (bloqueio) return bloqueio

    const body = await request.json()

    const username = await gerarUsername(body.name)
    const passwordHash = await bcrypt.hash("123456", 10)

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
        establishmentId: estabId,
        isActive: true,
        username,
        passwordHash,
        isFirstLogin: true,
      },
    })

    if (body.serviceIds?.length) {
      await prisma.userService.createMany({
        data: body.serviceIds.map((sid: string) => ({ userId: profissional.id, serviceId: sid })),
        skipDuplicates: true,
      })
    }
    if (body.schedules?.length) {
      await prisma.userSchedule.createMany({
        data: body.schedules.map((s: any) => ({ userId: profissional.id, ...s })),
        skipDuplicates: true,
      })
    }
    return NextResponse.json({ ...profissional, username })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
