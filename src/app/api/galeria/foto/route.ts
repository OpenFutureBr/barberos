import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("foto") as File | null
    const corteId = formData.get("corteId") as string | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    if (!corteId) return NextResponse.json({ error: "ID do corte é obrigatório" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const filename = `corte_${corteId}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)
    const url = `/uploads/${filename}`
    await prisma.haircut.update({ where: { id: corteId }, data: { photoUrl: url } })
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/galeria/foto]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
