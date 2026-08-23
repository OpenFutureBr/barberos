import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * Poll público (sem sessão) — o dispositivo tentando entrar consulta o
 * status do código a cada poucos segundos. Não vaza nada além do essencial.
 */
export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    const pareamento = await prisma.loginPairing.findUnique({ where: { token } })
    if (!pareamento) {
      return NextResponse.json({ status: "NOT_FOUND" }, { status: 404 })
    }

    if (pareamento.status === "PENDING" && pareamento.expiresAt < new Date()) {
      return NextResponse.json({ status: "EXPIRED", isTV: pareamento.isTV })
    }

    return NextResponse.json({ status: pareamento.status, isTV: pareamento.isTV })
  } catch (error) {
    console.error("[GET /api/auth/pairing/[token]]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

/**
 * Aprovação — chamada pelo dispositivo JÁ autenticado (o celular que leu o
 * QR). Exige sessão válida; vincula o código ao usuário logado.
 */
export async function POST(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { token } = await params

    const pareamento = await prisma.loginPairing.findUnique({ where: { token } })
    if (!pareamento) {
      return NextResponse.json({ error: "Código não encontrado" }, { status: 404 })
    }
    if (pareamento.expiresAt < new Date()) {
      return NextResponse.json({ error: "Código expirado" }, { status: 410 })
    }
    if (pareamento.status !== "PENDING") {
      return NextResponse.json({ error: "Código já utilizado" }, { status: 409 })
    }

    // Atualização condicional — evita corrida caso dois taps cheguem juntos
    const resultado = await prisma.loginPairing.updateMany({
      where: { token, status: "PENDING" },
      data: { status: "APPROVED", userId: session.user.id },
    })

    if (resultado.count === 0) {
      return NextResponse.json({ error: "Código já utilizado" }, { status: 409 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[POST /api/auth/pairing/[token]]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
