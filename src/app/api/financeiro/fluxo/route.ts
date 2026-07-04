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
type LancamentoPrevisto = { desc: string; valor: number; clienteId: string }

const STATUS_NAO_PROJETAVEL = ["DONE", "CANCELLED"] as const

export async function GET(request: Request) {
  try {
    const session = await auth()
    const ESTAB_ID = session?.user?.establishmentId
    if (!ESTAB_ID) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)

    const hoje = new Date()
    const limiteMinimo = new Date(hoje)
    limiteMinimo.setMonth(limiteMinimo.getMonth() - 3)
    limiteMinimo.setHours(0, 0, 0, 0)

    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    let inicio = fromParam ? new Date(`${fromParam}T00:00:00`) : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 30)
    let fim = toParam ? new Date(`${toParam}T23:59:59`) : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

    // Visão máxima permitida: M-3 em relação à data atual
    if (inicio < limiteMinimo) inicio = limiteMinimo
    if (fim < inicio) fim = inicio

    const [pagamentos, transacoes, assinaturas, pagamentosPendentes, apptsSemPagamento] = await Promise.all([
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

      // Assinaturas ativas cujo próximo vencimento cai no período
      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          nextBillingAt: { gte: inicio, lte: fim },
          client: { establishmentId: ESTAB_ID },
        },
        select: {
          id: true,
          price: true,
          nextBillingAt: true,
          clientId: true,
          client: { select: { name: true } },
          plan: { select: { name: true } },
        },
      }),

      // Projeção de receita — parte 1: pagamentos pendentes (ex.: "Pagar depois"),
      // projetados no vencimento (ou na data do agendamento, se não houver).
      prisma.payment.findMany({
        where: {
          status: "PENDING",
          appointment: { establishmentId: ESTAB_ID },
        },
        select: {
          amount: true,
          dueDate: true,
          appointment: { select: { scheduledAt: true } },
        },
      }),

      // Projeção de receita — parte 2: agendamentos ainda não concluídos nem
      // cancelados e que ainda não têm nenhum pagamento vinculado (senão a
      // receita já está contada na parte 1, para não duplicar).
      prisma.appointment.findMany({
        where: {
          establishmentId: ESTAB_ID,
          status: { notIn: STATUS_NAO_PROJETAVEL as any },
          payment: null,
        },
        select: {
          scheduledAt: true,
          service: { select: { price: true } },
        },
      }),
    ])

    const dayMap = new Map<string, { entradas: Lancamento[]; saidas: Lancamento[]; previstas: LancamentoPrevisto[]; projetado: number }>()

    const getOrCreate = (key: string) => {
      if (!dayMap.has(key)) dayMap.set(key, { entradas: [], saidas: [], previstas: [], projetado: 0 })
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

    for (const a of assinaturas) {
      const key = chaveData(new Date(a.nextBillingAt))
      const d = getOrCreate(key)
      d.previstas.push({
        desc: `${a.plan.name} — ${a.client.name}`,
        valor: arredondar(a.price),
        clienteId: a.clientId,
      })
    }

    // Projeção: bucket por dia dentro do período solicitado
    for (const p of pagamentosPendentes) {
      const dataRef = p.dueDate ?? p.appointment?.scheduledAt
      if (!dataRef) continue
      const dataResolvida = new Date(dataRef)
      if (dataResolvida < inicio || dataResolvida > fim) continue
      const key = chaveData(dataResolvida)
      getOrCreate(key).projetado += p.amount
    }

    for (const a of apptsSemPagamento) {
      const dataResolvida = new Date(a.scheduledAt)
      if (dataResolvida < inicio || dataResolvida > fim) continue
      const key = chaveData(dataResolvida)
      getOrCreate(key).projetado += a.service?.price ?? 0
    }

    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, { entradas, saidas, previstas, projetado }]) => {
        const totalEntradas = arredondar(entradas.reduce((s, e) => s + e.valor, 0))
        const totalSaidas = arredondar(saidas.reduce((s, e) => s + e.valor, 0))
        const totalPrevistas = arredondar(previstas.reduce((s, e) => s + e.valor, 0))
        return { data, entradas, saidas, previstas, totalEntradas, totalSaidas, totalPrevistas, receitaProjetada: arredondar(projetado) }
      })

    let saldoAcumulado = 0
    const daysComSaldo = days.map(d => {
      saldoAcumulado = arredondar(saldoAcumulado + d.totalEntradas - d.totalSaidas)
      return { ...d, saldo: saldoAcumulado }
    })

    const totalEntradas = arredondar(days.reduce((s, d) => s + d.totalEntradas, 0))
    const totalSaidas = arredondar(days.reduce((s, d) => s + d.totalSaidas, 0))
    const totalPrevistas = arredondar(assinaturas.reduce((s, a) => s + a.price, 0))
    const totalProjetado = arredondar(days.reduce((s, d) => s + d.receitaProjetada, 0))

    return NextResponse.json({
      from: chaveData(inicio),
      to: chaveData(fim),
      days: daysComSaldo,
      totalEntradas,
      totalSaidas,
      totalPrevistas,
      totalProjetado,
      saldoFinal: arredondar(totalEntradas - totalSaidas),
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    })
  } catch (e) {
    console.error("[GET /api/financeiro/fluxo]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
