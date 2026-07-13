import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { bloqueioSemPermissao } from "@/lib/permissoes"

// GET /api/whatsapp/historico?page=1&pageSize=20&status=ok|erro
export async function GET(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const bloqueio = bloqueioSemPermissao(session?.user, "whatsapp")
    if (bloqueio) return bloqueio

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20"))
    const statusFilter = searchParams.get("status") // "ok" | "erro" | null

    const where = {
      establishmentId: estabId,
      ...(statusFilter ? { status: statusFilter } : {}),
    }

    const [total, logs] = await Promise.all([
      prisma.whatsAppLog.count({ where }),
      prisma.whatsAppLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          clientName: true,
          phone: true,
          message: true,
          status: true,
          errorMsg: true,
          source: true,
          automationType: true,
          sentAt: true,
        },
      }),
    ])

    return NextResponse.json({ logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
