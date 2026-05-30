import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

  const passwordHash = await bcrypt.hash("123456", 10)

  await prisma.user.update({
    where: { id },
    data: { passwordHash, isFirstLogin: true },
  })

  return NextResponse.json({ ok: true })
}
