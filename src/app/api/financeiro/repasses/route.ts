import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)

    const ano = parseInt(searchParams.get("ano")!)
    const mes = parseInt(searchParams.get("mes")!)

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 0, 23, 59, 59)

    /**
     * 1. Pegamos atendimentos concluídos
     */
    const appts = await prisma.appointment.findMany({
      where: {
        establishmentId: ESTAB_ID,
        status: "DONE",
        scheduledAt: {
          gte: inicio,
          lte: fim,
        },
      },
      select: {
        professionalId: true,
        service: {
          select: {
            price: true,
          },
        },
      },
    })

    if (appts.length === 0) {
      return NextResponse.json([])
    }

    /**
     * 2. Buscar profissionais
     */
    const profissionaisIds = Array.from(
      new Set(appts.map((a) => a.professionalId)),
    )

    const profissionais = await prisma.user.findMany({
      where: {
        id: { in: profissionaisIds },
      },
      select: {
        id: true,
        name: true,
        employmentType: true,
        commissionPct: true,
        benchFee: true,
        benchFeePct: true,
      },
    })

    const mapaProf = Object.fromEntries(
      profissionais.map((p) => [p.id, p]),
    )

    /**
     * 3. Agrupar bruto + atendimentos
     */
    const mapa: Record<
      string,
      {
        profissionalId: string
        nome: string
        tipo: string
        commissionPct: number | null
        benchFee: number | null
        benchFeePct: number | null
        atendimentos: number
        bruto: number
        repasse: number
      }
    > = {}

    for (const a of appts) {
      const prof = mapaProf[a.professionalId]
      if (!prof) continue

      if (!mapa[a.professionalId]) {
        mapa[a.professionalId] = {
          profissionalId: prof.id,
          nome: prof.name,
          tipo: prof.employmentType,
          commissionPct: prof.commissionPct ?? null,
          benchFee: prof.benchFee ?? null,
          benchFeePct: prof.benchFeePct ?? null,
          atendimentos: 0,
          bruto: 0,
          repasse: 0,
        }
      }

      const item = mapa[a.professionalId]

      const valor = a.service?.price ?? 0

      item.atendimentos += 1
      item.bruto += valor

      /**
       * 4. Regra de repasse
       */

      let repasse = valor

      if (prof.commissionPct) {
        repasse = valor * (prof.commissionPct / 100)
      } else if (prof.benchFeePct) {
        repasse = valor * ((100 - prof.benchFeePct) / 100)
      }
      // benchFee fixo não entra aqui (é mensal)

      item.repasse += repasse
    }

    const resultado = Object.values(mapa)

    return NextResponse.json(resultado)
  } catch (error) {
    console.error("[GET /api/financeiro/repasses]", error)

    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    )
  }
}
