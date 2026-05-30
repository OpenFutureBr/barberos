import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { gerarUsername } from "@/lib/auth"

export const POST = auth(async (req, ctx) => {
  if (!req.auth || req.auth.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const id = (ctx?.params as any)?.id as string

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
}) as any
