import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// Percentual de cashback padrão por valor do serviço
function calcularPercentual(valor: number): number {
  if (valor >= 150) return 8
  if (valor >= 80) return 7
  return 5
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
      const pct = calcularPercentual(valorPago)
      const cashbackValor = Math.round(valorPago * (pct / 100) * 100) / 100

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

      // Registra a transação de cashback
      await prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: loyaltyAccount.id,
          type: "EARNED",
          amount: cashbackValor,
          description: `${appt.service?.name ?? "Serviço"} · ${pct}% cashback`,
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
