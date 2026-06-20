import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

function arredondar(v: number) {
  return Math.round(v * 100) / 100
}

function chaveData(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

type Lancamento = { desc: string; valor: number; tipo: string }

export async function GET(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const ano = parseInt(searchParams.get("ano") || String(new Date().getFullYear()))
    const mes = parseInt(searchParams.get("mes") || String(new Date().getMonth() + 1))

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 0, 23, 59, 59)

    const [pagamentos, transacoes] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: "PAID",
          dueDate: null,
          appointment: {
            establishmentId: ESTAB_ID,
            scheduledAt: { gte: inicio, lte: fim },
          },
        },
        select: {
          amount: true,
          method: true,
          createdAt: true,
          appointment: {
            select: {
              service: { select: { name: true } },
              client: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.transaction.findMany({
        where: {
          cashRegister: { establishmentId: ESTAB_ID },
          createdAt: { gte: inicio, lte: fim },
        },
        select: {
          type: true,
          amount: true,
          description: true,
          method: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ])

    const dayMap = new Map<string, { entradas: Lancamento[]; saidas: Lancamento[] }>()

    const getOrCreate = (key: string) => {
      if (!dayMap.has(key)) dayMap.set(key, { entradas: [], saidas: [] })
      return dayMap.get(key)!
    }

    for (const p of pagamentos) {
      const key = chaveData(new Date(p.createdAt))
      const d = getOrCreate(key)
      const clienteNome = p.appointment?.client?.name ?? ""
      const servicoNome = p.appointment?.service?.name ?? "Serviço"
      d.entradas.push({
        desc: clienteNome ? `${servicoNome} — ${clienteNome}` : servicoNome,
        valor: arredondar(p.amount),
        tipo: "servico",
      })
    }

    for (const t of transacoes) {
      const key = chaveData(new Date(t.createdAt))
      const d = getOrCreate(key)
      const isEntrada = t.type === "RECEITA" || t.type === "ENTRADA"
      const item = {
        desc: t.description ?? t.type,
        valor: arredondar(Math.abs(t.amount)),
        tipo: t.type,
      }
      if (isEntrada) d.entradas.push(item)
      else d.saidas.push(item)
    }

    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, { entradas, saidas }]) => {
        const totalEntradas = arredondar(entradas.reduce((s, e) => s + e.valor, 0))
        const totalSaidas = arredondar(saidas.reduce((s, e) => s + e.valor, 0))
        return { data, entradas, saidas, totalEntradas, totalSaidas }
      })

    let saldoAcumulado = 0
    const daysComSaldo = days.map(d => {
      saldoAcumulado = arredondar(saldoAcumulado + d.totalEntradas - d.totalSaidas)
      return { ...d, saldo: saldoAcumulado }
    })

    const totalEntradas = arredondar(days.reduce((s, d) => s + d.totalEntradas, 0))
    const totalSaidas = arredondar(days.reduce((s, d) => s + d.totalSaidas, 0))

    return NextResponse.json({
      days: daysComSaldo,
      totalEntradas,
      totalSaidas,
      saldoFinal: arredondar(totalEntradas - totalSaidas),
    })
  } catch (e) {
    console.error("[GET /api/financeiro/fluxo]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
