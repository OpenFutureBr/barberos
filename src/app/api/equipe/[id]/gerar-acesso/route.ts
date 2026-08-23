import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { auth, gerarUsername } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const estabId = session?.user?.establishmentId
  if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const bloqueio = bloqueioSemPermissao(session?.user, "equipe")
  if (bloqueio) return bloqueio

  const { id } = await params

  const user = await prisma.user.findFirst({ where: { id, establishmentId: estabId } })
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
