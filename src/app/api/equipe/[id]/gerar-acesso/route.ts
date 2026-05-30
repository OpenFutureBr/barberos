import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { gerarUsername } from "@/lib/auth"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

  if (user.username && user.passwordHash) {
    return NextResponse.json({ error: "Usuário já tem acesso configurado" }, { status: 400 })
  }

  const username = user.username ?? (await gerarUsername(user.name))
  const passwordHash = await bcrypt.hash("123456", 10)

  const updated = await prisma.user.update({
    where: { id },
    data: { username, passwordHash, isFirstLogin: true },
    select: { id: true, name: true, username: true, isFirstLogin: true },
  })

  return NextResponse.json(updated)
}
