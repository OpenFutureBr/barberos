import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { verificarCoberturaAssinatura, consumirCorteAssinatura } from "@/lib/assinatura"
import { gravarCreditoCashback } from "@/lib/cashback"

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

      // Gravações numa transação, com proteção contra crédito duplo (lib/cashback)
      await gravarCreditoCashback({
        paymentId: payment.id,
        client: appt.client,
        valorPago,
        cashbackValor,
        descricao,
        servicoBase: valorServico,
        servicoRate: pctServico,
        produtoBase: valorProdutos > 0 ? valorProdutos : null,
        produtoRate: valorProdutos > 0 ? pctProduto : null,
        cashbackConfigId: cashbackCfg.id,
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
        error: "Erro interno. Tente novamente.",
      },
      {
        status: 500,
      },
    )
  }
}