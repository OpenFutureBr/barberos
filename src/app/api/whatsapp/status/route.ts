import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { temPermissao } from "@/lib/permissoes"

const EVO_URL = process.env.EVOLUTION_API_URL
const EVO_KEY = process.env.EVOLUTION_API_KEY
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "barberos"

const headers = () => ({ "apikey": EVO_KEY ?? "" })

async function podeGerenciarWhatsapp() {
  const session = await auth()
  if (!session?.user?.establishmentId) return false
  return temPermissao(session.user, "whatsapp") || temPermissao(session.user, "configuracoes")
}

// GET  — connection state: { state: "open"|"close"|"connecting", qrcode?: string }
export async function GET() {
  if (!(await podeGerenciarWhatsapp())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  try {
    const res = await fetch(`${EVO_URL}/instance/connectionState/${EVO_INSTANCE}`, { headers: headers() })
    if (!res.ok) return NextResponse.json({ state: "close" })
    const data = await res.json()
    // Evolution v2 shape: { instance: { state: "open"|"close"|"connecting" } }
    const state: string = data?.instance?.state ?? data?.state ?? "close"
    return NextResponse.json({ state })
  } catch {
    return NextResponse.json({ state: "close" })
  }
}

// POST — connect / get QR code
export async function POST() {
  if (!(await podeGerenciarWhatsapp())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  try {
    // Try to connect existing instance
    const res = await fetch(`${EVO_URL}/instance/connect/${EVO_INSTANCE}`, { headers: headers() })
    const data = await res.json()

    // If instance doesn't exist, create it
    if (res.status === 404 || data?.status === 404) {
      const criar = await fetch(`${EVO_URL}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ instanceName: EVO_INSTANCE, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
      })
      const criado = await criar.json()
      return NextResponse.json({
        qrcode: criado?.qrcode?.base64 ?? criado?.base64 ?? null,
        state: "connecting",
      })
    }

    // Evolution v2: { base64: "data:image/png;base64,..." } or { qrcode: { base64: ... } }
    const qrcode = data?.base64 ?? data?.qrcode?.base64 ?? null
    return NextResponse.json({ qrcode, state: qrcode ? "connecting" : "open" })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
