import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// Rota pública de saúde: responde só ok/erro. Antes devolvia quais variáveis
// de ambiente existiam e a mensagem de erro do banco (com o ID do projeto) a
// qualquer pessoa. O detalhe vai para o log do servidor.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[healthz] banco indisponivel:", e)
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
