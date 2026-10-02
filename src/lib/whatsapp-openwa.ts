// Cliente OpenWA v0.11.0 (engine Baileys) — server-only.
// Nenhum outro arquivo deve montar URLs, cabeçalhos ou payloads do OpenWA diretamente.
//
// Fluxo de envio a um contato:
//   1. GET  /api/sessions                                    → localizar sessão por nome (nunca por UUID fixo, ele muda a cada recriação)
//   2. GET  /api/sessions/{sessionId}/contacts/check/{numero} → obter o whatsappId real (Baileys pode remover o 9º dígito)
//   3. POST /api/sessions/{sessionId}/messages/send-text      → enviar usando exatamente o whatsappId acima
//   4. GET  /api/sessions/{sessionId}/messages (polling)      → só "delivered" confirma a entrega; "failed" pode significar
//      que o contato nunca mandou mensagem para o número da empresa antes.

const HTTP_TIMEOUT_MS = 15_000
const POLL_INTERVAL_MS = 1_500
const DEFAULT_STATUS_TIMEOUT_MS = 30_000

export type WhatsAppDeliveryResult =
  | { ok: true; status: "DELIVERED"; messageId: string; chatId: string }
  | {
      ok: false
      status: "SESSION_NOT_READY" | "CONTACT_NOT_FOUND" | "PROVIDER_ERROR" | "FAILED" | "UNCONFIRMED" | "TIMEOUT"
      error: string
      messageId?: string
      chatId?: string
    }

type OpenWaConfig = { apiUrl: string; apiKey: string; sessionName: string; statusTimeoutMs: number }

type SessionInfo = { id: string; name: string; status: string; phone?: string | null }
type ContactCheckResponse = { exists?: boolean; whatsappId?: string | null }
type SendTextResponse = { messageId?: string }
type MessageRecord = { waMessageId?: string; status?: string }
type MessagesListResponse = { messages?: MessageRecord[] }

function getConfig(): OpenWaConfig | null {
  const apiUrl = process.env.OPENWA_BASE_URL
  const apiKey = process.env.OPENWA_API_KEY
  const sessionName = process.env.OPENWA_SESSION_NAME
  if (!apiUrl || !apiKey || !sessionName) return null

  const timeoutRaw = Number(process.env.OPENWA_STATUS_TIMEOUT_MS)
  const statusTimeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : DEFAULT_STATUS_TIMEOUT_MS

  return { apiUrl: apiUrl.replace(/\/+$/, "").replace(/\/api$/, ""), apiKey, sessionName, statusTimeoutMs }
}

export function isOpenWaAtivo(): boolean {
  return process.env.WHATSAPP_PROVIDER === "openwa"
}

export function getOpenWaManageUrl(): string | null {
  const apiUrl = process.env.OPENWA_BASE_URL
  if (!apiUrl) return null
  return apiUrl.replace(/\/+$/, "").replace(/\/api$/, "")
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizePhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  return digits.startsWith("55") ? digits : `55${digits}`
}

function sanitizeError(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "TimeoutError" || e.name === "AbortError") return "tempo limite excedido"
    return e.message.slice(0, 200)
  }
  return "erro desconhecido"
}

async function openwaFetch(cfg: OpenWaConfig, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-Key": cfg.apiKey, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    cache: "no-store",
  })
}

type SessionResult =
  | { ok: true; session: SessionInfo }
  | { ok: false; status: "SESSION_NOT_READY" | "PROVIDER_ERROR"; error: string }

async function findSession(cfg: OpenWaConfig): Promise<SessionResult> {
  let res: Response
  try {
    res = await openwaFetch(cfg, "/api/sessions")
  } catch (e) {
    return { ok: false, status: "PROVIDER_ERROR", error: `Falha ao consultar sessões do WhatsApp (${sanitizeError(e)}).` }
  }
  if (!res.ok) {
    return { ok: false, status: "PROVIDER_ERROR", error: `Consulta de sessões do WhatsApp falhou (HTTP ${res.status}).` }
  }

  let sessions: SessionInfo[]
  try {
    sessions = await res.json()
  } catch {
    return { ok: false, status: "PROVIDER_ERROR", error: "Resposta inválida ao consultar sessões do WhatsApp." }
  }

  const session = sessions.find(s => s.name === cfg.sessionName)
  if (!session) {
    return { ok: false, status: "SESSION_NOT_READY", error: `Sessão de WhatsApp "${cfg.sessionName}" não encontrada.` }
  }
  if (session.status !== "ready") {
    return { ok: false, status: "SESSION_NOT_READY", error: `Sessão de WhatsApp "${cfg.sessionName}" não está pronta (status: ${session.status}).` }
  }
  return { ok: true, session }
}

type ContactResult =
  | { ok: true; whatsappId: string }
  | { ok: false; status: "CONTACT_NOT_FOUND" | "PROVIDER_ERROR"; error: string }

async function checkContact(cfg: OpenWaConfig, sessionId: string, phoneDigits: string): Promise<ContactResult> {
  let res: Response
  try {
    res = await openwaFetch(cfg, `/api/sessions/${sessionId}/contacts/check/${phoneDigits}`)
  } catch (e) {
    return { ok: false, status: "PROVIDER_ERROR", error: `Falha ao validar o contato (${sanitizeError(e)}).` }
  }
  if (!res.ok) {
    return { ok: false, status: "PROVIDER_ERROR", error: `Validação de contato falhou (HTTP ${res.status}).` }
  }

  let body: ContactCheckResponse
  try {
    body = await res.json()
  } catch {
    return { ok: false, status: "PROVIDER_ERROR", error: "Resposta inválida na validação do contato." }
  }

  if (!body.exists || !body.whatsappId) {
    return { ok: false, status: "CONTACT_NOT_FOUND", error: "O número informado não foi localizado no WhatsApp." }
  }
  return { ok: true, whatsappId: body.whatsappId }
}

type SendResult = { ok: true; messageId: string } | { ok: false; error: string }

async function postSendText(cfg: OpenWaConfig, sessionId: string, chatId: string, text: string): Promise<SendResult> {
  let res: Response
  try {
    res = await openwaFetch(cfg, `/api/sessions/${sessionId}/messages/send-text`, {
      method: "POST",
      body: JSON.stringify({ chatId, text }),
    })
  } catch (e) {
    return { ok: false, error: `Falha ao enviar a mensagem (${sanitizeError(e)}).` }
  }
  if (!res.ok) {
    return { ok: false, error: `Envio da mensagem falhou (HTTP ${res.status}).` }
  }

  let body: SendTextResponse
  try {
    body = await res.json()
  } catch {
    return { ok: false, error: "Resposta inválida no envio da mensagem." }
  }
  if (!body.messageId) {
    return { ok: false, error: "O envio não retornou um identificador de mensagem." }
  }
  return { ok: true, messageId: body.messageId }
}

async function pollDeliveryStatus(
  cfg: OpenWaConfig,
  sessionId: string,
  messageId: string,
  chatId: string
): Promise<WhatsAppDeliveryResult> {
  const deadline = Date.now() + cfg.statusTimeoutMs
  let lastKnownStatus: string | null = null

  while (Date.now() < deadline) {
    try {
      const res = await openwaFetch(cfg, `/api/sessions/${sessionId}/messages`)
      if (res.ok) {
        const body: MessagesListResponse = await res.json()
        const match = body.messages?.find(m => m.waMessageId === messageId)
        if (match?.status) {
          lastKnownStatus = match.status
          if (match.status === "delivered") {
            return { ok: true, status: "DELIVERED", messageId, chatId }
          }
          if (match.status === "failed") {
            return {
              ok: false,
              status: "FAILED",
              error: "O WhatsApp recusou o envio. Esse contato pode precisar enviar uma mensagem para o número da empresa antes de receber notificações automáticas.",
              messageId,
              chatId,
            }
          }
        }
      }
    } catch {
      // instabilidade pontual na consulta — tenta de novo até o timeout
    }
    await sleep(POLL_INTERVAL_MS)
  }

  if (lastKnownStatus === "sent") {
    return {
      ok: false,
      status: "UNCONFIRMED",
      error: "Mensagem enviada ao WhatsApp, mas a entrega ainda não foi confirmada.",
      messageId,
      chatId,
    }
  }
  return { ok: false, status: "TIMEOUT", error: "Não foi possível confirmar o status da mensagem a tempo.", messageId, chatId }
}

/** Envia texto a um contato individual, validando o número e confirmando a entrega. */
export async function sendToContactViaOpenWa({ phone, text }: { phone: string; text: string }): Promise<WhatsAppDeliveryResult> {
  const cfg = getConfig()
  if (!cfg) {
    return { ok: false, status: "PROVIDER_ERROR", error: "Integração de WhatsApp (OpenWA) não configurada." }
  }

  const sessionResult = await findSession(cfg)
  if (!sessionResult.ok) return { ok: false, status: sessionResult.status, error: sessionResult.error }

  const phoneDigits = normalizePhoneBR(phone)
  const contact = await checkContact(cfg, sessionResult.session.id, phoneDigits)
  if (!contact.ok) return { ok: false, status: contact.status, error: contact.error }

  const sent = await postSendText(cfg, sessionResult.session.id, contact.whatsappId, text)
  if (!sent.ok) return { ok: false, status: "PROVIDER_ERROR", error: sent.error, chatId: contact.whatsappId }

  return pollDeliveryStatus(cfg, sessionResult.session.id, sent.messageId, contact.whatsappId)
}

export type OpenWaConnectionState = {
  state: "open" | "close" | "connecting"
  manageUrl: string | null
  sessionName: string | null
}

/** Estado da sessão para a tela de WhatsApp: "ready" → open, qualquer outro status → connecting/close. */
export async function getOpenWaConnectionState(): Promise<OpenWaConnectionState> {
  const manageUrl = getOpenWaManageUrl()
  const cfg = getConfig()
  const sessionName = cfg?.sessionName ?? null
  if (!cfg) return { state: "close", manageUrl, sessionName }

  let res: Response
  try {
    res = await openwaFetch(cfg, "/api/sessions")
  } catch {
    return { state: "close", manageUrl, sessionName }
  }
  if (!res.ok) return { state: "close", manageUrl, sessionName }

  let sessions: SessionInfo[]
  try {
    sessions = await res.json()
  } catch {
    return { state: "close", manageUrl, sessionName }
  }

  const session = sessions.find(s => s.name === cfg.sessionName)
  if (!session) return { state: "close", manageUrl, sessionName }
  if (session.status === "ready") return { state: "open", manageUrl, sessionName }
  if (session.status === "connecting" || session.status === "qr" || session.status === "starting") {
    return { state: "connecting", manageUrl, sessionName }
  }
  return { state: "close", manageUrl, sessionName }
}
