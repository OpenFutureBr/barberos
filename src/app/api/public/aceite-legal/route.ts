import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const DOCUMENT_VERSION = "1.0"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("org") ?? ""

  if (!orgId) return NextResponse.json({ error: "Empresa não informada" }, { status: 400 })

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, legalName: true, cnpj: true, email: true, ownerName: true, ownerEmail: true },
  })

  if (!org) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

  const ultimoAceite = await prisma.legalAcceptance.findFirst({
    where: { organizationId: orgId, documentVersion: DOCUMENT_VERSION },
    orderBy: { acceptedAt: "desc" },
    select: { acceptedAt: true, responsibleName: true },
  })

  return NextResponse.json({
    organization: org,
    documentVersion: DOCUMENT_VERSION,
    jaAceito: !!ultimoAceite,
    aceiteEm: ultimoAceite?.acceptedAt ?? null,
    aceitoPor: ultimoAceite?.responsibleName ?? null,
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { organizationId, legalName, cnpj, email, responsibleName } = body

  if (!organizationId || !String(legalName ?? "").trim() || !String(cnpj ?? "").trim() || !String(email ?? "").trim() || !String(responsibleName ?? "").trim()) {
    return NextResponse.json({ error: "Preencha todos os dados do contratante." }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } })
  if (!org) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null
  const userAgent = req.headers.get("user-agent")

  const aceite = await prisma.legalAcceptance.create({
    data: {
      organizationId,
      legalName: String(legalName).trim(),
      cnpj: String(cnpj).trim(),
      email: String(email).trim(),
      responsibleName: String(responsibleName).trim(),
      documentVersion: DOCUMENT_VERSION,
      ipAddress: ip,
      userAgent,
    },
    select: { id: true, acceptedAt: true },
  })

  return NextResponse.json({ ok: true, aceite }, { status: 201 })
}
