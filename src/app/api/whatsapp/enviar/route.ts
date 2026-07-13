import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { temPermissao } from "@/lib/permissoes"

const EVO_URL = process.env.EVOLUTION_API_URL
const EVO_KEY = process.env.EVOLUTION_API_KEY
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "barberos"

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    const userId = session?.user?.id
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (!temPermissao(session?.user, "whatsapp") && !temPermissao(session?.user, "clientes_ia")) {
      return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
    }

    const { telefone, mensagem, clientId, clientName } = await request.json()

    if (!telefone || !mensagem) {
      return NextResponse.json({ error: "telefone e mensagem são obrigatórios" }, { status: 400 })
    }

    const numero = telefone.replace(/\D/g, "")
    const numeroFinal = numero.startsWith("55") ? numero : `55${numero}`

    let status = "ok"
    let errorMsg: string | undefined

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
      status = "erro"
      errorMsg = data.message ?? "Erro ao enviar mensagem"
    }

    // Log the send attempt
    if (estabId) {
      await prisma.whatsAppLog.create({
        data: {
          establishmentId: estabId,
          clientId: clientId ?? null,
          clientName: clientName ?? "Desconhecido",
          phone: telefone,
          message: mensagem,
          status,
          errorMsg: errorMsg ?? null,
          source: "manual",
          sentById: userId ?? null,
        },
      })
    }

    if (status === "erro") {
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error("[WhatsApp] Erro:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
