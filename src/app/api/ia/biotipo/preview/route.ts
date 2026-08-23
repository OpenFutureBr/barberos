import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getIaConfig, geminiEditarImagem } from "@/lib/ia-providers"
import { bloqueioSemPermissao } from "@/lib/permissoes"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const bloqueio = bloqueioSemPermissao(session.user, "ia_biotipo")
  if (bloqueio) return bloqueio

  const { imageBase64, corte, descricao } = await req.json().catch(() => ({}))
  if (!imageBase64) return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 })
  if (!corte) return NextResponse.json({ error: "Corte obrigatório" }, { status: 400 })

  const cfg = await getIaConfig()
  if (!cfg.geminiApiKey) {
    return NextResponse.json(
      { error: "Preview de corte precisa da chave do Gemini (o Groq não gera imagem). Configure em Admin > Config. IA." },
      { status: 503 },
    )
  }

  const prompt = `Edite esta foto aplicando o seguinte corte de cabelo na pessoa retratada: "${corte}"${descricao ? ` (${descricao})` : ""}.
Mantenha o rosto, a identidade, a iluminação, o enquadramento e o fundo da foto original intactos — altere apenas o cabelo.
Gere uma imagem realista e fotográfica, sem texto sobreposto, sem marca d'água.`

  try {
    const imagem = await geminiEditarImagem(cfg.geminiApiKey, prompt, imageBase64)
    return NextResponse.json({ imageBase64: imagem.data, mimeType: imagem.mimeType })
  } catch (err: any) {
    console.error("[ia/biotipo/preview]", err)
    return NextResponse.json({ error: "Erro ao gerar preview: " + (err?.message ?? "desconhecido") }, { status: 500 })
  }
}
