import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const rows = await prisma.platformConfig.findMany({
    where: { key: { in: ["empresa_cnpj", "empresa_endereco", "empresa_cep"] } },
  })
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return NextResponse.json({
    cnpj: m["empresa_cnpj"] || "",
    endereco: m["empresa_endereco"] || "",
    cep: m["empresa_cep"] || "",
  })
}
