import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { normalizarMarca, corValida, type Marca } from "@/lib/marca"

// GET  /api/org/marca — identidade visual da organizacao (White-label)
// PUT  /api/org/marca — grava; so ADMIN / ORG_OWNER
//
// Endpoint separado do /api/org/config de proposito: a LEITURA aqui e liberada
// para qualquer usuario autenticado da organizacao, porque a cor da marca
// precisa pintar a interface de todo mundo (um barbeiro sem permissao de
// "configuracoes" tambem tem que ver o sistema na cor da barbearia). O
// /api/org/config continua fechado porque carrega outras chaves do orgConfig.

export async function GET() {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    if (!orgId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, logoUrl: true, orgConfig: true },
    })
    const cfg = (org?.orgConfig ?? {}) as Record<string, unknown>
    const marca = normalizarMarca(cfg.marca)

    return NextResponse.json(
      {
        ...marca,
        // Sem nome de marca definido, o nome da organizacao e o fallback usado
        // no preview e no shell.
        nome: marca.nome || org?.name || "",
        logoUrl: org?.logoUrl ?? null,
      },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } },
    )
  } catch (error) {
    console.error("[GET /api/org/marca]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !["ADMIN", "ORG_OWNER"].includes(role ?? "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

    for (const campo of ["corPrimaria", "corSecundaria"] as const) {
      const valor = texto(body[campo], 7)
      if (valor && !corValida(valor)) {
        return NextResponse.json({ error: `Cor inválida em ${campo}. Use o formato #rrggbb.` }, { status: 400 })
      }
    }

    const marca: Marca = {
      nome: texto(body.nome, 60),
      slogan: texto(body.slogan, 120),
      corPrimaria: texto(body.corPrimaria, 7).toLowerCase(),
      corSecundaria: texto(body.corSecundaria, 7).toLowerCase(),
      // so o host: tira esquema, barras e espacos que o usuario cole sem querer
      dominio: texto(body.dominio, 120).replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase(),
    }

    // Merge parcial: preserva as outras chaves do orgConfig (playlists etc.)
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { orgConfig: true } })
    const atual = (org?.orgConfig ?? {}) as Record<string, unknown>
    await prisma.organization.update({
      where: { id: orgId },
      data: { orgConfig: { ...atual, marca } },
    })

    return NextResponse.json(marca)
  } catch (error) {
    console.error("[PUT /api/org/marca]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
