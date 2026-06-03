import { NextResponse } from "next/server"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"
import prisma from "@/lib/prisma"
import { registrarUpload } from "@/lib/storage"

const ESTAB_ID = "estab001"
const MAX_SIZE = 3 * 1024 * 1024 // 3 MB
const EXTS_PERMITIDAS = ["jpg", "jpeg", "png", "webp", "svg"]

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("logo") as File | null

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo muito grande (máx 3 MB)." }, { status: 400 })
    }

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
    if (!EXTS_PERMITIDAS.includes(ext)) {
      return NextResponse.json({ error: `Formato inválido. Use: ${EXTS_PERMITIDAS.join(", ")}.` }, { status: 400 })
    }

    // Resolve organização vinculada ao estabelecimento
    const estab = await prisma.establishment.findUnique({
      where: { id: ESTAB_ID },
      select: { organizationId: true, logoUrl: true },
    })

    const orgId = estab?.organizationId ?? ESTAB_ID

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    // Remove logo anterior da mesma organização (qualquer extensão)
    for (const e of EXTS_PERMITIDAS) {
      try {
        await unlink(path.join(uploadDir, `logo_${orgId}.${e}`))
      } catch { /* não existe, ignora */ }
    }

    const filename = `logo_${orgId}.${ext}`
    await writeFile(path.join(uploadDir, filename), buffer)

    // Cache busting via query string (o arquivo em si tem nome fixo por org)
    const logoUrl = `/uploads/${filename}?v=${Date.now()}`
    const logoPath = `/uploads/${filename}`

    // Salva na organização e no estabelecimento
    await Promise.all([
      prisma.establishment.update({
        where: { id: ESTAB_ID },
        data: { logoUrl: logoPath },
      }),
      orgId !== ESTAB_ID
        ? prisma.organization.update({
            where: { id: orgId },
            data: { logoUrl: logoPath },
          })
        : Promise.resolve(),
    ])

    registrarUpload(buffer.length)

    return NextResponse.json({ url: logoUrl })
  } catch (error) {
    console.error("[POST /api/configuracoes/logo]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
