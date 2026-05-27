import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { novaSenha } = await req.json()
  if (!novaSenha || novaSenha.length < 6) {
    return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres" }, { status: 400 })
  }

  const hash = await bcrypt.hash(novaSenha, 10)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hash, isFirstLogin: false },
  })

  return NextResponse.json({ ok: true })
}
