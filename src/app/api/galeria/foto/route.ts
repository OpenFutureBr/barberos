import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { registrarUpload } from "@/lib/storage"
import { auth } from "@/lib/auth"
import { uploadLogo, mimeFromExt } from "@/lib/supabase-storage"

// Antes gravava em public/uploads via fs.writeFile — mesmo problema do
// servicos/foto: filesystem somente-leitura em produção no Vercel. Agora
// usa o Supabase Storage já usado para logos.
export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("foto") as File | null
    const corteId = formData.get("corteId") as string | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    if (!corteId) return NextResponse.json({ error: "ID do corte é obrigatório" }, { status: 400 })

    const existente = await prisma.haircut.findFirst({ where: { id: corteId, establishmentId: estabId }, select: { id: true } })
    if (!existente) return NextResponse.json({ error: "Corte não encontrado" }, { status: 404 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const url = await uploadLogo(`corte/${corteId}.${ext}`, buffer, mimeFromExt(ext))
    await prisma.haircut.update({ where: { id: corteId }, data: { photoUrl: url } })
    registrarUpload(buffer.length)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/galeria/foto]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
