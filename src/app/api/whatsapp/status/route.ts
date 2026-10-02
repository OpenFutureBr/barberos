import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { temPermissao } from "@/lib/permissoes"
import { getOpenWaConnectionState } from "@/lib/whatsapp-openwa"

async function podeGerenciarWhatsapp() {
  const session = await auth()
  if (!session?.user?.establishmentId) return false
  return temPermissao(session.user, "whatsapp") || temPermissao(session.user, "configuracoes")
}

// GET — estado da sessão: { state: "open"|"close"|"connecting", manageUrl: string|null }
export async function GET() {
  if (!(await podeGerenciarWhatsapp())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const estado = await getOpenWaConnectionState()
  return NextResponse.json(estado)
}

// POST — mesma consulta; não há QR code via API própria do OpenWA.
// A sessão é criada/escaneada direto no painel do OpenWA (manageUrl).
export async function POST() {
  if (!(await podeGerenciarWhatsapp())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const estado = await getOpenWaConnectionState()
  return NextResponse.json(estado)
}
