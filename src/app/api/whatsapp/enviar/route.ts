import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { temPermissao } from "@/lib/permissoes"
import { sendToContactViaOpenWa } from "@/lib/whatsapp-openwa"

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

    const resultado = await sendToContactViaOpenWa({ phone: telefone, text: mensagem })

    const status = resultado.ok || resultado.status === "UNCONFIRMED" ? "ok" : "erro"
    const errorMsg = resultado.ok ? undefined : resultado.error

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

    if (status === "erro") {
      return NextResponse.json({ error: errorMsg }, { status: 502 })
    }
    return NextResponse.json({ ok: true, status: resultado.status })
  } catch (error) {
    console.error("[WhatsApp] Erro:", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
