// Status do agendamento: rótulo e cor únicos para o sistema inteiro.
//
// Antes cada tela tinha o seu mapa: SCHEDULED era "Pendente" na agenda e
// "Agendado" no domicílio e no PIX, CONFIRMED era verde numa e azul noutra,
// NO_SHOW cinza × vermelho.

export type StatusAgendamento =
  | "SCHEDULED" | "CONFIRMED" | "IN_QUEUE" | "IN_PROGRESS"
  | "DONE" | "CANCELLED" | "NO_SHOW" | "WITHDRAWN"

type Estilo = {
  rotulo: string
  /** cor do texto, para status solto numa linha */
  texto: string
  /** fundo + texto + borda, para pílula */
  pilula: string
}

export const STATUS_AGENDAMENTO: Record<StatusAgendamento, Estilo> = {
  SCHEDULED:   { rotulo: "Agendado",       texto: "text-amber-400",  pilula: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  CONFIRMED:   { rotulo: "Confirmado",     texto: "text-green-400",  pilula: "bg-green-500/10 text-green-400 border-green-500/20" },
  IN_QUEUE:    { rotulo: "Na fila",        texto: "text-purple-400", pilula: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  IN_PROGRESS: { rotulo: "Em atendimento", texto: "text-blue-400",   pilula: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  DONE:        { rotulo: "Concluído",      texto: "text-zinc-400",   pilula: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  CANCELLED:   { rotulo: "Cancelado",      texto: "text-red-400",    pilula: "bg-red-500/10 text-red-400 border-red-500/20" },
  NO_SHOW:     { rotulo: "Não compareceu", texto: "text-red-400",    pilula: "bg-red-500/10 text-red-400 border-red-500/20" },
  WITHDRAWN:   { rotulo: "Desistência",    texto: "text-orange-400", pilula: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
}

// No atendimento a domicílio, "em atendimento" é o barbeiro a caminho
const ROTULOS_DOMICILIO: Partial<Record<StatusAgendamento, string>> = {
  IN_PROGRESS: "Em rota",
}

function estilo(status: string): Estilo | undefined {
  return STATUS_AGENDAMENTO[status as StatusAgendamento]
}

export function rotuloStatus(status: string, contexto?: "domicilio"): string {
  if (contexto === "domicilio") {
    const r = ROTULOS_DOMICILIO[status as StatusAgendamento]
    if (r) return r
  }
  return estilo(status)?.rotulo ?? status
}

export function corTextoStatus(status: string): string {
  return estilo(status)?.texto ?? "text-zinc-500"
}

export function pilulaStatus(status: string): string {
  return estilo(status)?.pilula ?? STATUS_AGENDAMENTO.SCHEDULED.pilula
}

/** Ordem do fluxo, para montar <select> de status */
export const ORDEM_STATUS: StatusAgendamento[] = [
  "SCHEDULED", "CONFIRMED", "IN_QUEUE", "IN_PROGRESS", "DONE", "CANCELLED", "NO_SHOW", "WITHDRAWN",
]
