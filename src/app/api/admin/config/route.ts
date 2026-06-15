import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

async function assertAdmin() {
  const session = await auth()
  if ((session?.user as any)?.role !== "ADMIN") return false
  return true
}

export async function GET() {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const rows = await prisma.platformConfig.findMany()
  const config: Record<string, string> = {}
  for (const r of rows) config[r.key] = r.value

  return NextResponse.json(config)
}

export async function PUT(req: Request) {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  const body = await req.json().catch(() => ({})) as Record<string, string>

  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== "string") continue
    await prisma.platformConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }

  return NextResponse.json({ ok: true })
}
