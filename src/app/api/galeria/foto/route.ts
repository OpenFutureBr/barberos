import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import prisma from "@/lib/prisma"
import { registrarUpload } from "@/lib/storage"
import { auth } from "@/lib/auth"

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
    const filename = `corte_${corteId}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)
    const url = `/uploads/${filename}`
    await prisma.haircut.update({ where: { id: corteId }, data: { photoUrl: url } })
    registrarUpload(buffer.length)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/galeria/foto]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
