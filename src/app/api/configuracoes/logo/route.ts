import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import prisma from "@/lib/prisma"
import { registrarUpload } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("logo") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Arquivo muito grande (máx 3MB)" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
    const filename = `logo_estab001.${ext}`

    const dir = path.join(process.cwd(), "public", "uploads")
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), buffer)

    const logoUrl = `/uploads/${filename}`

    // Tenta salvar no banco — se falhar, retorna a URL mesmo assim
    // O usuário pode confirmar via "Salvar alterações"
    try {
      await prisma.establishment.update({ where: { id: "estab001" }, data: { logoUrl } })
    } catch (dbErr) {
      console.warn("[logo] DB update falhou, mas arquivo foi salvo:", dbErr)
    }

    registrarUpload(buffer.length)
    return NextResponse.json({ url: `${logoUrl}?v=${Date.now()}` })
  } catch (error) {
    console.error("[POST /api/configuracoes/logo]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
