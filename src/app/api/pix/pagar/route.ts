import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { verificarCoberturaAssinatura, consumirCorteAssinatura } from "@/lib/assinatura"

type CashbackConfig = {
  servicos: number
  domicilio: number
  produtos: number
  assinaturas: number
}

type MetodoEntrada =
  | "PIX"
  | "CASH"
  | "CARD"
  | "CARD_CREDITO"
  | "CARD_DEBITO"
  | "DINHEIRO"
  | "CREDITO"
  | "DEBITO"
  | "PAY_LATER"
  | "CASHBACK"
  | "SUBSCRIPTION"

const defaultCashbackConfig: CashbackConfig = {
  servicos: 7,
  domicilio: 5,
  produtos: 3,
  assinaturas: 10,
}

function normalizarMetodo(method: MetodoEntrada | string | undefined) {
  if (!method) return "PIX"

  const m = String(method).toUpperCase()

  if (m === "DINHEIRO") return "CASH"
  if (m === "CREDITO") return "CARD"
  if (m === "DEBITO") return "CARD"
  if (m === "CARD_CREDITO") return "CARD"
  if (m === "CARD_DEBITO") return "CARD"

  if (m === "PAY_LATER") return "PAY_LATER"
  if (m === "PIX") return "PIX"
  if (m === "CASH") return "CASH"
  if (m === "CARD") return "CARD"
  if (m === "CASHBACK") return "CASHBACK"
  if (m === "SUBSCRIPTION") return "SUBSCRIPTION"

  return "PIX"
}

function parseValor(valor: unknown) {
  if (typeof valor === "number") return valor

  if (typeof valor === "string") {
    const n = Number(valor.replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }

  return 0
}

async function getCashbackConfig(estabId: string): Promise<CashbackConfig & { id?: string }> {
  try {
    // Busca a versão mais recente da tabela histórica
    const cfg = await prisma.cashbackConfig.findFirst({
      where: {
        establishmentId: estabId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (cfg) return cfg

    // Fallback: lê do JSON do estabelecimento
    const estab = await prisma.establishment.findUnique({
      where: {
        id: estabId,
      },
      select: {
        cashbackConfig: true,
      },
    })

    if (estab?.cashbackConfig && typeof estab.cashbackConfig === "object") {
      return {
        ...defaultCashbackConfig,
        ...(estab.cashbackConfig as object),
      }
    }
  } catch {}

  return defaultCashbackConfig
}

function calcularNivel(totalGasto: number): "BRONZE" | "SILVER" | "GOLD" | "VIP" {
  if (totalGasto >= 5000) return "VIP"
  if (totalGasto >= 2000) return "GOLD"
  if (totalGasto >= 500) return "SILVER"

  return "BRONZE"
}

async function calcularSegmento(clientId: string, novoTotalAtend: number): Promise<string> {
  // VIP: assinante ativo
  const sub = await prisma.subscription.findUnique({
    where: {
      clientId,
    },
    select: {
      status: true,
    },
  })

  if (sub?.status === "ACTIVE") return "VIP"

  // VIP: 5+ cortes nos últimos 30 dias
  const trintaDias = new Date()
  trintaDias.setDate(trintaDias.getDate() - 30)

  const recentes = await prisma.appointment.count({
    where: {
      clientId,
      status: "DONE" as any,
      scheduledAt: {
        gte: trintaDias,
      },
    },
  })

  if (recentes >= 5) return "VIP"

  // Níveis por total de atendimentos
  if (novoTotalAtend <= 2) return "NEW"
  if (novoTotalAtend <= 9) return "REGULAR"
  if (novoTotalAtend <= 19) return "AT_RISK"

  return "INACTIVE"
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const estabId = session?.user?.establishmentId
    if (!estabId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await request.json()

    const appointmentId = String(body.appointmentId ?? "")
    const method = normalizarMetodo(body.method)
    const valorPago = parseValor(body.amount)
    const dueDate = body.dueDate ? new Date(body.dueDate) : null

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Agendamento não informado." },
        { status: 400 },
      )
    }

    if (valorPago <= 0) {
      return NextResponse.json(
        { error: "Valor do pagamento inválido." },
        { status: 400 },
      )
    }

    const isPagarDepois = method === "PAY_LATER"

    if (isPagarDepois && !dueDate) {
      return NextResponse.json(
        { error: "Informe a data de vencimento para pagamento posterior." },
        { status: 400 },
      )
    }

    // Busca o agendamento com cliente e serviço — escopado ao estabelecimento
    // da sessão para impedir que um caller confirme pagamento de outra org.
    const appt = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
        establishmentId: estabId,
      },
      include: {
        client: true,
        service: true,
      },
    })

    if (!appt) {
      return NextResponse.json(
        { error: "Agendamento não encontrado." },
        { status: 404 },
      )
    }

    const pagamentoAnterior = await prisma.payment.findUnique({
      where: {
        appointmentId,
      },
      select: {
        id: true,
        status: true,
      },
    })

    /**
     * Regra:
     * - PAY_LATER fica pendente no financeiro
     * - os demais métodos são considerados pagos quando o usuário confirma
     */
    const paymentStatus = isPagarDepois ? "PENDING" : "PAID"
    const pixStatus = method === "PIX" && !isPagarDepois ? "PAID" : "PENDING"
    const pixPaidAt = paymentStatus === "PAID" ? new Date() : null

    /**
     * Se for pagamento imediato, verifica cobertura por assinatura — e se
     * ainda sobra corte incluso no mês. Só então o corte sai de graça (o
     * cliente paga só os produtos, derivados do valor informado menos o
     * preço do serviço); além da quota, cobra normalmente.
     */
    let cobertoPorAssinatura = false
    let corteGratis = false

    if (!isPagarDepois && appt.client) {
      const cobertura = await verificarCoberturaAssinatura(appt.client.id, appt.service, appt.serviceType)
      cobertoPorAssinatura = cobertura.coberto
      corteGratis = cobertura.coberto && cobertura.dentroDaQuota

      if (corteGratis) {
        await consumirCorteAssinatura(appt.client.id).catch(() => {})
      }
    }

    const valorProdutos = Math.max(0, valorPago - (appt.service?.price ?? 0))
    const valorFinal = corteGratis ? valorProdutos : valorPago

    // Cria ou atualiza o Payment
    const payment = await prisma.payment.upsert({
      where: {
        appointmentId,
      },
      create: {
        method: method as any,
        status: paymentStatus as any,
        amount: valorFinal,
        dueDate: isPagarDepois ? dueDate : null,
        pixStatus: pixStatus as any,
        pixPaidAt,
        splitType: "SPLIT_ESTABLISHMENT",
        appointmentId,
      },
      update: {
        method: method as any,
        status: paymentStatus as any,
        amount: valorFinal,
        dueDate: isPagarDepois ? dueDate : null,
        pixStatus: pixStatus as any,
        pixPaidAt,
        splitType: "SPLIT_ESTABLISHMENT",
      },
    })

    // Marca o agendamento como concluído
    await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        status: "DONE" as any,
        finishedAt: new Date(),
      },
    })

    /**
     * Cashback e métricas do cliente:
     * - só gera quando o pagamento estiver PAID
     * - evita duplicar cashback caso o endpoint seja chamado novamente
     *
     * Observação:
     * pagamentos PAY_LATER terão cashback tratado depois, quando forem quitados
     * no financeiro, se decidirmos ativar essa regra no próximo ajuste.
     */
    const deveCreditarCashback =
      paymentStatus === "PAID" && pagamentoAnterior?.status !== "PAID"

    if (deveCreditarCashback && appt.client) {
      const clientId = appt.client.id
      const cashbackCfg = await getCashbackConfig(appt.establishmentId)

      // Separa serviço de produtos
      const valorServico = Math.min(appt.service?.price ?? 0, valorPago)
      const valorProdutos = Math.max(0, valorPago - valorServico)

      const isDomicilio = appt.serviceType === "HOME_VISIT"

      const pctServico = cobertoPorAssinatura
        ? cashbackCfg.assinaturas
        : isDomicilio
          ? cashbackCfg.domicilio
          : cashbackCfg.servicos

      const pctProduto = cashbackCfg.produtos

      const cashbackServico = valorServico * (pctServico / 100)
      const cashbackProduto = valorProdutos * (pctProduto / 100)
      const cashbackValor = Math.round((cashbackServico + cashbackProduto) * 100) / 100

      const descricao =
        valorProdutos > 0
          ? `${appt.service?.name ?? "Serviço"} · ${pctServico}% + produtos · ${pctProduto}%`
          : `${appt.service?.name ?? "Serviço"} · ${pctServico}%`

      // Upsert da conta de fidelidade
      const loyaltyAccount = await prisma.loyaltyAccount.upsert({
        where: {
          clientId,
        },
        create: {
          clientId,
          totalEarned: cashbackValor,
          totalRedeemed: 0,
          currentBalance: cashbackValor,
          totalPoints: Math.floor(valorPago),
        },
        update: {
          totalEarned: {
            increment: cashbackValor,
          },
          currentBalance: {
            increment: cashbackValor,
          },
          totalPoints: {
            increment: Math.floor(valorPago),
          },
        },
      })

      // Registra a transação com auditoria completa dos percentuais aplicados
      await prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: loyaltyAccount.id,
          type: "EARNED",
          amount: cashbackValor,
          description: descricao,
          servicoBase: valorServico,
          servicoRate: pctServico,
          produtoBase: valorProdutos > 0 ? valorProdutos : null,
          produtoRate: valorProdutos > 0 ? pctProduto : null,
          ...(cashbackCfg.id ? { cashbackConfigId: cashbackCfg.id } : {}),
        },
      })

      // Calcula corte e produto favorito do cliente
      const todasAppts = await prisma.appointment.findMany({
        where: {
          clientId,
          status: {
            notIn: ["CANCELLED", "NO_SHOW"] as any,
          },
        },
        select: {
          id: true,
          service: {
            select: {
              name: true,
            },
          },
        },
      })

      const apptIds = todasAppts.map((a) => a.id)

      const todosMovs =
        apptIds.length === 0
          ? []
          : await prisma.stockMovement.findMany({
              where: {
                type: "SAIDA",
                appointmentId: {
                  in: apptIds,
                },
              },
              select: {
                quantity: true,
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            })

      // Corte favorito: serviço mais frequente
      const svcCount: Record<string, number> = {}

      for (const a of todasAppts) {
        if (a.service?.name) {
          svcCount[a.service.name] = (svcCount[a.service.name] ?? 0) + 1
        }
      }

      const favoritoCorte =
        Object.entries(svcCount).sort((a, b) =>
          b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "pt-BR"),
        )[0]?.[0] ?? null

      // Produto favorito: produto mais vendido por quantidade
      const prodCount: Record<string, number> = {}

      for (const m of todosMovs) {
        if (m.product?.name) {
          prodCount[m.product.name] = (prodCount[m.product.name] ?? 0) + m.quantity
        }
      }

      const favoritoProduto =
        Object.entries(prodCount).sort((a, b) =>
          b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "pt-BR"),
        )[0]?.[0] ?? null

      // Atualiza saldo, nível, favoritos e métricas materializadas
      const novoTotal = appt.client.totalSpent + valorPago
      const novasVisitas = appt.client.totalAtendimentos + 1
      const novoTicketMedio = Math.round((novoTotal / novasVisitas) * 100) / 100
      const novoSegmento = await calcularSegmento(clientId, novasVisitas)

      await prisma.client.update({
        where: {
          id: clientId,
        },
        data: {
          cashbackBalance: {
            increment: cashbackValor,
          },
          totalSpent: {
            increment: valorPago,
          },
          totalAtendimentos: {
            increment: 1,
          },
          ticketMedio: novoTicketMedio,
          lastVisitAt: new Date(),
          loyaltyLevel: calcularNivel(novoTotal) as any,
          segment: novoSegmento as any,
          favoritoCorte,
          favoritoProduto,
        },
      })

      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          cashbackGenerated: cashbackValor,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      payment,
      pending: isPagarDepois,
    })
  } catch (error) {
    console.error("[POST /api/pix/pagar]", error)

    return NextResponse.json(
      {
        error: String(error),
      },
      {
        status: 500,
      },
    )
  }
}