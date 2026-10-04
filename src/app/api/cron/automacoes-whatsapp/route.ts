import { NextResponse } from "next/server"
import { processarConfirmacoes, processarLembretes } from "@/lib/automacoes-whatsapp"

// Vercel: duração máxima dessa function (precisa de plano Pro+ pra valer acima de 10-15s;
// no Hobby é limitado e esse valor é ignorado/capado). Envios não esperam confirmação de
// entrega (ver confirmarEntrega:false em automacoes-whatsapp.ts) justamente pra não depender disso.
export const maxDuration = 60

// Chamada pelo cron da VPS a cada ~10-15min. Protegida por CRON_SECRET
// (header "Authorization: Bearer <CRON_SECRET>"), não pela sessão do usuário.
async function executar(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const confirmacoes = await processarConfirmacoes()
    const lembretes = await processarLembretes()
    return NextResponse.json({ ok: true, confirmacoes, lembretes })
  } catch (error) {
    console.error("[cron automacoes-whatsapp]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return executar(request)
}

export async function POST(request: Request) {
  return executar(request)
}
