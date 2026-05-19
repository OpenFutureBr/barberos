import { NextResponse } from "next/server"

const EVO_URL = process.env.EVOLUTION_API_URL
const EVO_KEY = process.env.EVOLUTION_API_KEY
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "barberos"

export async function POST(request: Request) {
  try {
    const { telefone, mensagem } = await request.json()

    if (!telefone || !mensagem) {
      return NextResponse.json({ error: "telefone e mensagem são obrigatórios" }, { status: 400 })
    }

    // Limpa e formata o número (garante código do país)
    const numero = telefone.replace(/\D/g, "")
    const numeroFinal = numero.startsWith("55") ? numero : `55${numero}`

    const res = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVO_KEY ?? "",
      },
      body: JSON.stringify({
        number: numeroFinal,
        textMessage: { text: mensagem },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("[WhatsApp] Erro Evolution API:", data)
      return NextResponse.json({ error: data.message ?? "Erro ao enviar mensagem" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error("[WhatsApp] Erro:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
