// Disparo das automações de WhatsApp por tempo (confirmação, lembrete), chamado
// periodicamente pelo cron da VPS via /api/cron/automacoes-whatsapp.
//
// Cada agendamento só recebe 1 mensagem por tipo de automação: antes de enviar,
// verifica se já existe um WhatsAppLog com esse appointmentId + automationType.

import prisma from "@/lib/prisma"
import { sendToContactViaOpenWa } from "@/lib/whatsapp-openwa"

type ResultadoAutomacao = { enviadas: number; puladas: number; erros: number }

function automacaoAtiva(whatsappConfig: unknown, tipo: string, defaultAtiva: boolean): boolean {
  const config = (whatsappConfig ?? {}) as Record<string, unknown>
  const toggles = (config.automacoes ?? {}) as Record<string, boolean>
  return toggles[tipo] !== undefined ? toggles[tipo] : defaultAtiva
}

function fmtHora(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
}
function fmtData(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Pausa entre envios dentro do mesmo tick do cron, pra não disparar mensagens
// em rajada (risco de o WhatsApp tratar como comportamento de spam/bot).
const PAUSA_ENTRE_ENVIOS_MS = 3_000

type ContextoMensagem = { nomeCliente: string; nomeServico: string; nomeEstabelecimento: string; horario: Date }

async function processarJanela(opts: {
  tipo: "confirmacao" | "lembrete"
  janelaInicioMs: number
  janelaFimMs: number
  defaultAtiva: boolean
  montarMensagem: (ctx: ContextoMensagem) => string
}): Promise<ResultadoAutomacao> {
  const agora = new Date()
  const inicio = new Date(agora.getTime() + opts.janelaInicioMs)
  const fim = new Date(agora.getTime() + opts.janelaFimMs)

  const estabelecimentos = await prisma.establishment.findMany({
    where: { isActive: true },
    select: { id: true, name: true, whatsappConfig: true },
  })

  let enviadas = 0
  let puladas = 0
  let erros = 0
  let primeiroEnvio = true

  for (const estab of estabelecimentos) {
    if (!automacaoAtiva(estab.whatsappConfig, opts.tipo, opts.defaultAtiva)) continue

    const appointments = await prisma.appointment.findMany({
      where: {
        establishmentId: estab.id,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        scheduledAt: { gte: inicio, lte: fim },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { name: true } },
      },
    })

    for (const appt of appointments) {
      if (!appt.client.phone) {
        puladas++
        continue
      }

      const jaEnviado = await prisma.whatsAppLog.findFirst({
        where: { appointmentId: appt.id, automationType: opts.tipo },
        select: { id: true },
      })
      if (jaEnviado) {
        puladas++
        continue
      }

      if (!primeiroEnvio) await sleep(PAUSA_ENTRE_ENVIOS_MS)
      primeiroEnvio = false

      const mensagem = opts.montarMensagem({
        nomeCliente: appt.client.name,
        nomeServico: appt.service.name,
        nomeEstabelecimento: estab.name,
        horario: appt.scheduledAt,
      })

      const resultado = await sendToContactViaOpenWa({ phone: appt.client.phone, text: mensagem })
      const status = resultado.ok || resultado.status === "UNCONFIRMED" ? "ok" : "erro"

      await prisma.whatsAppLog.create({
        data: {
          establishmentId: estab.id,
          clientId: appt.client.id,
          clientName: appt.client.name,
          phone: appt.client.phone,
          message: mensagem,
          status,
          errorMsg: resultado.ok ? null : resultado.error,
          source: "automation",
          automationType: opts.tipo,
          appointmentId: appt.id,
        },
      })

      if (status === "ok") enviadas++
      else erros++
    }
  }

  return { enviadas, puladas, erros }
}

export function processarConfirmacoes() {
  return processarJanela({
    tipo: "confirmacao",
    janelaInicioMs: 23 * 60 * 60 * 1000,
    janelaFimMs: 25 * 60 * 60 * 1000,
    defaultAtiva: true,
    montarMensagem: ({ nomeCliente, nomeServico, nomeEstabelecimento, horario }) =>
      `Olá ${nomeCliente}! Confirmando seu horário de ${nomeServico} na ${nomeEstabelecimento}, dia ${fmtData(horario)} às ${fmtHora(horario)}. Qualquer imprevisto, é só responder aqui. 💈`,
  })
}

export function processarLembretes() {
  return processarJanela({
    tipo: "lembrete",
    janelaInicioMs: 50 * 60 * 1000,
    janelaFimMs: 70 * 60 * 1000,
    defaultAtiva: true,
    montarMensagem: ({ nomeCliente, nomeServico, nomeEstabelecimento, horario }) =>
      `Olá ${nomeCliente}! Lembrando que seu horário de ${nomeServico} na ${nomeEstabelecimento} é hoje às ${fmtHora(horario)}. Te esperamos! 💈`,
  })
}
