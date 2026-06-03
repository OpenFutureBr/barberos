import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import prisma from "@/lib/prisma"
import { registrarUpload } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("foto") as File | null
    const servicoId = formData.get("servicoId") as string | null

    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    if (!servicoId) return NextResponse.json({ error: "ID do serviço é obrigatório" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const filename = `servico_${servicoId}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads")

    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)

    const url = `/uploads/${filename}`

    await prisma.service.update({ where: { id: servicoId }, data: { photoUrl: url } })
    registrarUpload(buffer.length)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/servicos/foto]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
