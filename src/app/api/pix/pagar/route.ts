import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

type CashbackConfig = { servicos: number; domicilio: number; produtos: number; assinaturas: number }

const defaultCashbackConfig: CashbackConfig = { servicos: 7, domicilio: 5, produtos: 3, assinaturas: 10 }

async function getCashbackConfig(): Promise<CashbackConfig & { id?: string }> {
  try {
    // Busca a versão mais recente da tabela histórica
    const cfg = await prisma.cashbackConfig.findFirst({
      where: { establishmentId: "estab001" },
      orderBy: { createdAt: "desc" },
    })
    if (cfg) return cfg
    // Fallback: lê do JSON do estabelecimento
    const estab = await prisma.establishment.findUnique({ where: { id: "estab001" }, select: { cashbackConfig: true } })
    if (estab?.cashbackConfig && typeof estab.cashbackConfig === "object") {
      return { ...defaultCashbackConfig, ...(estab.cashbackConfig as object) }
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { appointmentId, method, amount } = body
    const valorPago = parseFloat(amount)

    // Busca o agendamento com cliente e serviço
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        service: true,
      },
    })

    // Verifica cobertura por assinatura ativa
    let cobertoPorAssinatura = false
    if (appt?.client) {
      const assinatura = await prisma.subscription.findUnique({
        where: { clientId: appt.client.id },
        include: { plan: { select: { services: true, atendedomicilio: true } } },
      })
      if (assinatura && (assinatura.status === "ACTIVE")) {
        const categoriaServico = appt.service?.category ?? null
        const categoriasPlano = assinatura.plan.services // String[] de categorias
        // Coberto se: plano não tem restrição de categoria OU categoria do serviço está na lista
        const categoriaCoberta = categoriasPlano.length === 0 || (categoriaServico && categoriasPlano.includes(categoriaServico))
        // Domicílio: se for home visit, plano precisa aceitar domicílio
        const domicilioCoberto = appt.serviceType !== "HOME_VISIT" || assinatura.plan.atendedomicilio
        cobertoPorAssinatura = !!(categoriaCoberta && domicilioCoberto)
      }
    }

    // Cria o Payment
    const payment = await prisma.payment.create({
      data: {
        method: method as any,
        amount: valorPago,
        pixStatus: "PAID",
        splitType: "SPLIT_ESTABLISHMENT",
        appointmentId,
      },
    })

    // Marca o agendamento como concluído
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "DONE" as any, finishedAt: new Date() },
    })

    // Credita cashback se encontrou o cliente
    if (appt?.client) {
      const clientId = appt.client.id
      const cashbackCfg = await getCashbackConfig()

      // Separa serviço de produtos
      const valorServico = Math.min(appt.service?.price ?? 0, valorPago)
      const valorProdutos = Math.max(0, valorPago - valorServico)

      const isdomicilio = appt.serviceType === "HOME_VISIT"
      const pctServico = cobertoPorAssinatura
        ? cashbackCfg.assinaturas
        : isdomicilio ? cashbackCfg.domicilio : cashbackCfg.servicos
      const pctProduto = cashbackCfg.produtos

      const cashbackServico = valorServico * (pctServico / 100)
      const cashbackProduto = valorProdutos * (pctProduto / 100)
      const cashbackValor = Math.round((cashbackServico + cashbackProduto) * 100) / 100

      const descricao = valorProdutos > 0
        ? `${appt.service?.name ?? "Serviço"} · ${pctServico}% + produtos · ${pctProduto}%`
        : `${appt.service?.name ?? "Serviço"} · ${pctServico}%`

      // Upsert da conta de fidelidade
      const loyaltyAccount = await prisma.loyaltyAccount.upsert({
        where: { clientId },
        create: {
          clientId,
          totalEarned: cashbackValor,
          totalRedeemed: 0,
          currentBalance: cashbackValor,
          totalPoints: Math.floor(valorPago),
        },
        update: {
          totalEarned: { increment: cashbackValor },
          currentBalance: { increment: cashbackValor },
          totalPoints: { increment: Math.floor(valorPago) },
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

      // Atualiza saldo e nível do cliente
      const novoTotal = appt.client.totalSpent + valorPago
      await prisma.client.update({
        where: { id: clientId },
        data: {
          cashbackBalance: { increment: cashbackValor },
          totalSpent: { increment: valorPago },
          lastVisitAt: new Date(),
          loyaltyLevel: calcularNivel(novoTotal) as any,
        },
      })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("[POST /api/pix/pagar]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
