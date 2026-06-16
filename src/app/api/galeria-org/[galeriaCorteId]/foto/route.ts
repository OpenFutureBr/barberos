import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { registrarUpload } from "@/lib/storage"

export async function POST(request: Request, { params }: { params: Promise<{ galeriaCorteId: string }> }) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { galeriaCorteId } = await params
    const formData = await request.formData()
    const file = formData.get("foto") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const filename = `org_corte_${orgId}_${galeriaCorteId}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)
    const url = `/uploads/${filename}`

    const orgCorte = await prisma.orgCorte.upsert({
      where: { galeriaCorteId_organizationId: { galeriaCorteId, organizationId: orgId } },
      create: { galeriaCorteId, organizationId: orgId, isEnabled: true, customPhotoUrl: url },
      update: { customPhotoUrl: url },
    })
    registrarUpload(buffer.length)
    return NextResponse.json({ url, orgCorteId: orgCorte.id })
  } catch (error) {
    console.error("[POST /api/galeria-org/[id]/foto]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
