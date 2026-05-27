import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { gerarUsername } from "@/lib/auth"
import bcrypt from "bcryptjs"

// Endpoint de configuração inicial — cria o admin se ainda não existe.
// Pode ser chamado apenas uma vez (enquanto nenhum usuário tiver username).
export async function GET() {
  try {
    // Verifica se já existe algum usuário com username configurado
    const jaConfigurado = await prisma.user.findFirst({
      where: { username: { not: null } },
    })
    if (jaConfigurado) {
      return NextResponse.json({ error: "Setup já foi realizado." }, { status: 400 })
    }

    // Busca o primeiro ADMIN
    let admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    })

    // Se não existir nenhum ADMIN, usa o primeiro usuário
    if (!admin) {
      admin = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } })
    }

    if (!admin) {
      return NextResponse.json({ error: "Nenhum usuário encontrado no banco." }, { status: 404 })
    }

    const username = await gerarUsername(admin.name)
    const passwordHash = await bcrypt.hash("123456", 10)

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        username,
        passwordHash,
        isFirstLogin: true,
        role: "ADMIN",
      },
    })

    return NextResponse.json({
      ok: true,
      usuario: username,
      senha: "123456",
      nome: admin.name,
      aviso: "Troque a senha imediatamente no primeiro acesso.",
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
