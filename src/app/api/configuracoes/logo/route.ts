import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { uploadLogo, urlToStoragePath, deleteLogo, mimeFromExt } from "@/lib/supabase-storage"
import { registrarUpload } from "@/lib/storage"

const MAX_SIZE = 3 * 1024 * 1024
const EXTS = ["jpg", "jpeg", "png", "webp", "svg"]

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("logo") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Arquivo muito grande (máx 3 MB)." }, { status: 400 })

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
    if (!EXTS.includes(ext)) {
      return NextResponse.json({ error: `Formato inválido. Use: ${EXTS.join(", ")}.` }, { status: 400 })
    }

    const estab = await prisma.establishment.findUnique({
      where: { id: estabId },
      select: { organizationId: true, logoUrl: true },
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `unit/${estabId}.${ext}`

    // Remove logo anterior do storage se existir
    if (estab?.logoUrl) {
      const old = urlToStoragePath(estab.logoUrl)
      if (old) await deleteLogo(old)
    }

    const publicUrl = await uploadLogo(storagePath, buffer, mimeFromExt(ext))

    await prisma.establishment.update({ where: { id: estabId }, data: { logoUrl: publicUrl } })

    registrarUpload(buffer.length, estabId)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("[POST /api/configuracoes/logo]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
