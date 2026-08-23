import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hojeISOemBRT, anoMesAtualBRT, limitesMesBRT } from "@/lib/data-brt"
import { temPermissao } from "@/lib/permissoes"

const ROLES_PERMITIDOS = ["ADMIN", "ORG_OWNER", "ORG_MANAGER"]

export async function GET(request: Request) {
  try {
    const session = await auth()
    const orgId = session?.user?.organizationId
    const role = session?.user?.role
    if (!orgId || !ROLES_PERMITIDOS.includes(role ?? "") || !temPermissao(session?.user, "unidades")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    let inicio: Date
    let fim: Date
    if (fromParam && toParam) {
      inicio = new Date(`${fromParam}T00:00:00-03:00`)
      fim = new Date(`${toParam}T23:59:59-03:00`)
    } else {
      const { ano, mes } = anoMesAtualBRT()
      ;({ inicio, fim } = limitesMesBRT(ano, mes))
    }

    const establishments = await prisma.establishment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, city: true, state: true, isActive: true,
        _count: { select: { users: { where: { isActive: true } }, clients: { where: { isActive: true } } } },
      },
    })

    const unidades = await Promise.all(establishments.map(async (e) => {
      const appointments = await prisma.appointment.findMany({
        where: {
          establishmentId: e.id,
          status: "DONE" as any,
          scheduledAt: { gte: inicio, lte: fim },
        },
        select: {
          service: { select: { name: true, price: true } },
          payment: { select: { amount: true } },
        },
      })

      const faturamento = appointments.reduce((s, a) => s + (a.payment?.amount ?? a.service.price), 0)

      const porServico: Record<string, number> = {}
      for (const a of appointments) {
        porServico[a.service.name] = (porServico[a.service.name] ?? 0) + 1
      }
      const topServico = Object.entries(porServico).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      return {
        id: e.id,
        nome: e.name,
        cidade: e.city,
        estado: e.state,
        ativa: e.isActive,
        equipe: e._count.users,
        clientes: e._count.clients,
        atendimentos: appointments.length,
        faturamento: Math.round(faturamento * 100) / 100,
        ticketMedio: appointments.length > 0 ? Math.round((faturamento / appointments.length) * 100) / 100 : 0,
        topServico,
      }
    }))

    const totais = unidades.reduce((s, u) => ({
      atendimentos: s.atendimentos + u.atendimentos,
      faturamento: s.faturamento + u.faturamento,
      equipe: s.equipe + u.equipe,
      clientes: s.clientes + u.clientes,
    }), { atendimentos: 0, faturamento: 0, equipe: 0, clientes: 0 })

    return NextResponse.json({
      geradoEm: new Date().toISOString(),
      periodo: { from: fromParam ?? hojeISOemBRT().slice(0, 8) + "01", to: toParam ?? hojeISOemBRT() },
      unidades,
      totais: { ...totais, faturamento: Math.round(totais.faturamento * 100) / 100 },
    })
  } catch (error) {
    console.error("[GET /api/unidades/relatorio-executivo]", error)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
