import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { registrarUpload } from "@/lib/storage"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const { id } = await params
    const formData = await request.formData()
    const file = formData.get("foto") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const filename = `galeria_${id}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)
    const url = `/uploads/${filename}`
    await prisma.galeriaCorte.update({ where: { id }, data: { photoUrl: url } })
    registrarUpload(buffer.length)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/galeria-global/[id]/foto]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
