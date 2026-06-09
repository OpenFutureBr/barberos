import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { uploadLogo, urlToStoragePath, deleteLogo, mimeFromExt } from "@/lib/supabase-storage"
import { registrarUpload } from "@/lib/storage"

const MAX_SIZE = 3 * 1024 * 1024
const EXTS = ["jpg", "jpeg", "png", "webp", "svg"]

// POST /api/org/logo — upload logo no nível da organização (ORG_OWNER/ADMIN)
export async function POST(request: Request) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !["ADMIN", "ORG_OWNER"].includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("logo") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Arquivo muito grande (máx 3 MB)." }, { status: 400 })

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
    if (!EXTS.includes(ext)) {
      return NextResponse.json({ error: `Formato inválido. Use: ${EXTS.join(", ")}.` }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { logoUrl: true } })

    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `org/${orgId}.${ext}`

    if (org?.logoUrl) {
      const old = urlToStoragePath(org.logoUrl)
      if (old) await deleteLogo(old)
    }

    const publicUrl = await uploadLogo(storagePath, buffer, mimeFromExt(ext))

    await prisma.organization.update({ where: { id: orgId }, data: { logoUrl: publicUrl } })

    // Registrar storage na org (sem estab vinculado)
    registrarUpload(buffer.length, null, orgId)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("[POST /api/org/logo]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE /api/org/logo — remove logo da org (volta para sem logo)
export async function DELETE() {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !["ADMIN", "ORG_OWNER"].includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { logoUrl: true } })
    if (org?.logoUrl) {
      const path = urlToStoragePath(org.logoUrl)
      if (path) await deleteLogo(path)
    }

    await prisma.organization.update({ where: { id: orgId }, data: { logoUrl: null } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
