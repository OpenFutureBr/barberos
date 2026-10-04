import prisma from "@/lib/prisma"

// Partes do crédito de cashback que eram copiadas em /api/financeiro
// (marcar-pago) e /api/pix/pagar. O cálculo do percentual continua em cada
// rota: as regras diferem (o PIX trata assinatura, o financeiro não).

export function calcularNivel(totalGasto: number): "BRONZE" | "SILVER" | "GOLD" | "VIP" {
  if (totalGasto >= 5000) return "VIP"
  if (totalGasto >= 2000) return "GOLD"
  if (totalGasto >= 500) return "SILVER"
  return "BRONZE"
}

export async function calcularSegmento(clientId: string, novoTotalAtend: number): Promise<string> {
  // VIP: assinante ativo
  const sub = await prisma.subscription.findUnique({ where: { clientId }, select: { status: true } })
  if (sub?.status === "ACTIVE") return "VIP"

  // VIP: 5+ cortes nos últimos 30 dias
  const trintaDias = new Date()
  trintaDias.setDate(trintaDias.getDate() - 30)
  const recentes = await prisma.appointment.count({
    where: { clientId, status: "DONE", scheduledAt: { gte: trintaDias } },
  })
  if (recentes >= 5) return "VIP"

  // Níveis por total de atendimentos
  if (novoTotalAtend <= 2) return "NEW"
  if (novoTotalAtend <= 9) return "REGULAR"
  if (novoTotalAtend <= 19) return "AT_RISK"
  return "INACTIVE"
}

// Maior contagem; empate desempata pelo nome (mesma regra de antes)
function maisFrequente(contagem: Map<string, number>): string | null {
  return [...contagem.entries()].sort((a, b) =>
    b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "pt-BR"),
  )[0]?.[0] ?? null
}

/**
 * Corte favorito (serviço mais frequente) e produto favorito (mais unidades)
 * do cliente, sem contar cancelados/faltas.
 *
 * Antes trazia uma linha por agendamento e por movimento de estoque de todo o
 * histórico do cliente; agora agrupa no banco. A contagem continua por NOME
 * do serviço/produto (dois cadastros com o mesmo nome somam juntos).
 */
export async function calcularFavoritos(clientId: string) {
  const STATUS_FORA = ["CANCELLED", "NO_SHOW"] as const
  const [porServico, appts] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { clientId, status: { notIn: [...STATUS_FORA] } },
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: { clientId, status: { notIn: [...STATUS_FORA] } },
      select: { id: true },
    }),
  ])

  const porProduto = appts.length === 0 ? [] : await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { type: "SAIDA", appointmentId: { in: appts.map(a => a.id) } },
    _sum: { quantity: true },
  })

  const [servicos, produtos] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: porServico.map(s => s.serviceId) } }, select: { id: true, name: true } }),
    porProduto.length
      ? prisma.product.findMany({ where: { id: { in: porProduto.map(p => p.productId) } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ])
  const nomeServico = new Map(servicos.map(s => [s.id, s.name]))
  const nomeProduto = new Map(produtos.map(p => [p.id, p.name]))

  const contServico = new Map<string, number>()
  for (const s of porServico) {
    const nome = nomeServico.get(s.serviceId)
    if (nome) contServico.set(nome, (contServico.get(nome) ?? 0) + s._count._all)
  }
  const contProduto = new Map<string, number>()
  for (const p of porProduto) {
    const nome = nomeProduto.get(p.productId)
    if (nome) contProduto.set(nome, (contProduto.get(nome) ?? 0) + (p._sum.quantity ?? 0))
  }

  return { favoritoCorte: maisFrequente(contServico), favoritoProduto: maisFrequente(contProduto) }
}

type Credito = {
  paymentId: string
  client: { id: string; totalSpent: number; totalAtendimentos: number }
  valorPago: number
  cashbackValor: number
  descricao: string
  servicoBase: number
  servicoRate: number
  produtoBase: number | null
  produtoRate: number | null
  cashbackConfigId?: string
}

/**
 * Grava o crédito de cashback e as métricas do cliente numa transação.
 *
 * Antes eram ~5 gravações soltas e a proteção contra crédito duplo era uma
 * leitura (`cashbackGenerated > 0`) feita antes delas: duas confirmações quase
 * simultâneas do mesmo pagamento passavam as duas e creditavam em dobro, e uma
 * falha no meio deixava saldo creditado sem o registro correspondente.
 *
 * Agora o primeiro passo "reserva" o pagamento com um update condicional; se
 * outra chamada já reservou, nada é gravado e a função devolve false.
 */
export async function gravarCreditoCashback(c: Credito): Promise<boolean> {
  // Consultas antes da transação (não seguram a conexão da transação)
  const novoTotal = c.client.totalSpent + c.valorPago
  const novasVisitas = c.client.totalAtendimentos + 1
  const novoTicketMedio = Math.round((novoTotal / novasVisitas) * 100) / 100
  const [novoSegmento, favoritos] = await Promise.all([
    calcularSegmento(c.client.id, novasVisitas),
    calcularFavoritos(c.client.id),
  ])

  return prisma.$transaction(async (tx) => {
    if (c.cashbackValor > 0) {
      const reserva = await tx.payment.updateMany({
        where: { id: c.paymentId, cashbackGenerated: 0 },
        data: { cashbackGenerated: c.cashbackValor },
      })
      if (reserva.count === 0) return false // já creditado por outra chamada
    }

    const conta = await tx.loyaltyAccount.upsert({
      where: { clientId: c.client.id },
      create: {
        clientId: c.client.id,
        totalEarned: c.cashbackValor,
        totalRedeemed: 0,
        currentBalance: c.cashbackValor,
        totalPoints: Math.floor(c.valorPago),
      },
      update: {
        totalEarned: { increment: c.cashbackValor },
        currentBalance: { increment: c.cashbackValor },
        totalPoints: { increment: Math.floor(c.valorPago) },
      },
    })

    await tx.loyaltyTransaction.create({
      data: {
        loyaltyAccountId: conta.id,
        type: "EARNED",
        amount: c.cashbackValor,
        description: c.descricao,
        servicoBase: c.servicoBase,
        servicoRate: c.servicoRate,
        produtoBase: c.produtoBase,
        produtoRate: c.produtoRate,
        ...(c.cashbackConfigId ? { cashbackConfigId: c.cashbackConfigId } : {}),
      },
    })

    await tx.client.update({
      where: { id: c.client.id },
      data: {
        cashbackBalance: { increment: c.cashbackValor },
        totalSpent: { increment: c.valorPago },
        totalAtendimentos: { increment: 1 },
        ticketMedio: novoTicketMedio,
        lastVisitAt: new Date(),
        loyaltyLevel: calcularNivel(novoTotal),
        segment: novoSegmento as never,
        favoritoCorte: favoritos.favoritoCorte,
        favoritoProduto: favoritos.favoritoProduto,
      },
    })
    return true
  })
}
