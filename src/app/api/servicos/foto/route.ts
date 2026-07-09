import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { registrarUpload } from "@/lib/storage"
import { auth } from "@/lib/auth"
import { uploadLogo, mimeFromExt } from "@/lib/supabase-storage"

// Antes gravava em public/uploads via fs.writeFile — funciona em dev, mas o
// filesystem do Vercel é somente-leitura em produção (fora de /tmp, que é
// efêmero e não é servido como arquivo estático). O upload falhava ou não
// persistia depois do deploy. Agora usa o mesmo Supabase Storage já usado
// para logos.
export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("foto") as File | null
    const servicoId = formData.get("servicoId") as string | null

    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    if (!servicoId) return NextResponse.json({ error: "ID do serviço é obrigatório" }, { status: 400 })

    const existente = await prisma.service.findFirst({ where: { id: servicoId, establishmentId: estabId }, select: { id: true } })
    if (!existente) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const url = await uploadLogo(`servico/${servicoId}.${ext}`, buffer, mimeFromExt(ext))

    await prisma.service.update({ where: { id: servicoId }, data: { photoUrl: url } })
    registrarUpload(buffer.length)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/servicos/foto]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
