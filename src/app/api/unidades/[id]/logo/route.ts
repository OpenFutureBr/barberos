import { NextResponse } from "next/server"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"
import prisma from "@/lib/prisma"
import { registrarUpload } from "@/lib/storage"
import { auth } from "@/lib/auth"

const MAX_SIZE = 3 * 1024 * 1024
const EXTS = ["jpg", "jpeg", "png", "webp", "svg"]
const ROLES_PERMITIDOS = ["ADMIN", "ORG_OWNER", "ORG_MANAGER"]

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !ROLES_PERMITIDOS.includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const estab = await prisma.establishment.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })
    if (!estab) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get("logo") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Arquivo muito grande (máx 3 MB)." }, { status: 400 })

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
    if (!EXTS.includes(ext)) {
      return NextResponse.json({ error: `Formato inválido. Use: ${EXTS.join(", ")}.` }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    for (const e of EXTS) {
      try { await unlink(path.join(uploadDir, `logo_unit_${id}.${e}`)) } catch {}
    }

    const filename = `logo_unit_${id}.${ext}`
    await writeFile(path.join(uploadDir, filename), buffer)

    const logoPath = `/uploads/${filename}`
    const logoUrl = `${logoPath}?v=${Date.now()}`

    await prisma.establishment.update({ where: { id }, data: { logoUrl: logoPath } })

    registrarUpload(buffer.length)
    return NextResponse.json({ url: logoUrl })
  } catch (error) {
    console.error("[POST /api/unidades/[id]/logo]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
