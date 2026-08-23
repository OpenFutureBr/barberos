import prisma from "@/lib/prisma"

export type CoberturaAssinatura = {
  /** O plano da assinatura cobre a categoria/domicílio deste serviço. */
  coberto: boolean
  /** Ainda sobra corte incluso no plano neste mês de referência. */
  dentroDaQuota: boolean
  subscriptionId: string | null
}

/**
 * Verifica se um cliente tem assinatura ativa que cobre um serviço, e se
 * ainda tem cortes inclusos disponíveis no mês — a cobrança do corte em si
 * só é dispensada quando as duas condições são verdadeiras.
 */
export async function verificarCoberturaAssinatura(
  clientId: string,
  service: { category: string | null },
  serviceType: string,
): Promise<CoberturaAssinatura> {
  const assinatura = await prisma.subscription.findUnique({
    where: { clientId },
    include: {
      plan: { select: { services: true, atendedomicilio: true, cortesIncluidos: true } },
    },
  })

  if (!assinatura || assinatura.status !== "ACTIVE") {
    return { coberto: false, dentroDaQuota: false, subscriptionId: null }
  }

  const categoriasPlano = assinatura.plan.services
  const categoriaCoberta =
    categoriasPlano.length === 0 ||
    (!!service.category && categoriasPlano.includes(service.category))
  const domicilioCoberto = serviceType !== "HOME_VISIT" || assinatura.plan.atendedomicilio
  const coberto = !!(categoriaCoberta && domicilioCoberto)

  const mesAtual = new Date().toISOString().slice(0, 7)
  const usadosNesteMes = assinatura.mesReferencia === mesAtual ? assinatura.cortesUsados : 0
  const dentroDaQuota = usadosNesteMes < assinatura.plan.cortesIncluidos

  return { coberto, dentroDaQuota, subscriptionId: assinatura.id }
}

/** Registra o uso de um corte incluso, resetando o contador se virou o mês. */
export async function consumirCorteAssinatura(clientId: string) {
  const mesAtual = new Date().toISOString().slice(0, 7)
  const atual = await prisma.subscription.findUnique({
    where: { clientId },
    select: { mesReferencia: true },
  })
  const resetou = atual?.mesReferencia !== mesAtual

  await prisma.subscription.update({
    where: { clientId },
    data: {
      cortesUsados: resetou ? 1 : { increment: 1 },
      mesReferencia: mesAtual,
    },
  })
}
