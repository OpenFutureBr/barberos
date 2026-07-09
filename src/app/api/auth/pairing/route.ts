import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import prisma from "@/lib/prisma"

const VALIDADE_MS = 3 * 60 * 1000 // 3 minutos

/**
 * Cria um código de pareamento para login por QR — sem autenticação, é
 * exatamente o dispositivo tentando entrar (TV, computador novo) que chama
 * isso antes de ter sessão.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const isTV = body?.isTV === true

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + VALIDADE_MS)

    await prisma.loginPairing.create({
      data: { token, isTV, expiresAt },
    })

    return NextResponse.json({ token, expiresAt })
  } catch (error) {
    console.error("[POST /api/auth/pairing]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
