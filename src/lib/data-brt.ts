// Utilidade para calcular "hoje" no fuso de Brasília (America/Sao_Paulo),
// não no fuso do servidor.
//
// Bug que isso corrige: em produção (Vercel), o servidor roda em UTC. Código
// que fazia `new Date(d.getFullYear(), d.getMonth(), d.getDate())` calculava
// o dia usando o fuso do SERVIDOR (UTC), não o do Brasil (UTC-3). A partir
// das 21h no horário de Brasília (00h UTC), o servidor já considera "hoje"
// como o dia seguinte — então caixa aberto, lançamentos e agendamentos do
// dia "desapareciam" das telas de "hoje" nesse intervalo, todo santo dia.
//
// Brasil não tem mais horário de verão (abolido em 2019), então o offset
// -03:00 é fixo o ano inteiro — não precisa de lib de timezone.

const OFFSET_BRT = "-03:00"

/**
 * Em que dia (YYYY-MM-DD) do fuso de Brasília um instante cai. Use isso em
 * vez de `data.getDate()/getMonth()/getFullYear()` para agrupar registros
 * por dia — os getters locais usam o fuso do SERVIDOR (UTC em produção),
 * não o do Brasil, e jogam qualquer coisa criada depois das 21h BRT para
 * o dia seguinte.
 */
export function diaISOemBRT(data: Date): string {
  // toLocaleString com timeZone retorna a data/hora local de São Paulo,
  // independente do fuso em que o processo Node está rodando.
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data)

  const y = partes.find((p) => p.type === "year")!.value
  const m = partes.find((p) => p.type === "month")!.value
  const d = partes.find((p) => p.type === "day")!.value
  return `${y}-${m}-${d}`
}

/** Data/hora atual, mas com o dia calculado no fuso de Brasília. */
export function hojeISOemBRT(): string {
  return diaISOemBRT(new Date())
}

/** Início (00:00) e fim (23:59:59) do dia de hoje, no fuso de Brasília. */
export function limitesHojeBRT(): { inicio: Date; fim: Date } {
  const iso = hojeISOemBRT()
  return {
    inicio: new Date(`${iso}T00:00:00${OFFSET_BRT}`),
    fim: new Date(`${iso}T23:59:59${OFFSET_BRT}`),
  }
}

/** Início/fim de um dia arbitrário (YYYY-MM-DD), no fuso de Brasília. */
export function limitesDiaBRT(diaISO: string): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(`${diaISO}T00:00:00${OFFSET_BRT}`),
    fim: new Date(`${diaISO}T23:59:59${OFFSET_BRT}`),
  }
}

/**
 * Soma/subtrai dias de uma data YYYY-MM-DD sem depender do fuso do
 * servidor — usa Date.UTC/getUTC* internamente, que é timezone-agnóstico.
 */
export function somarDiasISO(diaISO: string, dias: number): string {
  const [y, m, d] = diaISO.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + dias)
  return dt.toISOString().slice(0, 10)
}

/** Soma/subtrai meses de uma data YYYY-MM-DD, mesmo cuidado de fuso. */
export function somarMesesISO(diaISO: string, meses: number): string {
  const [y, m, d] = diaISO.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCMonth(dt.getUTCMonth() + meses)
  return dt.toISOString().slice(0, 10)
}

/** Ano e mês (1-indexado) de hoje, calculados no fuso de Brasília. */
export function anoMesAtualBRT(): { ano: number; mes: number } {
  const [ano, mes] = hojeISOemBRT().split("-").map(Number)
  return { ano, mes }
}

/**
 * Início/fim de um mês (1-indexado) no fuso de Brasília. `Date.UTC` só é
 * usado para calcular quantos dias o mês tem — não afeta o horário final,
 * que é sempre construído com offset -03:00 explícito.
 */
export function limitesMesBRT(ano: number, mes1indexado: number): { inicio: Date; fim: Date } {
  const mesStr = String(mes1indexado).padStart(2, "0")
  const ultimoDia = new Date(Date.UTC(ano, mes1indexado, 0)).getUTCDate()
  return {
    inicio: new Date(`${ano}-${mesStr}-01T00:00:00${OFFSET_BRT}`),
    fim: new Date(`${ano}-${mesStr}-${String(ultimoDia).padStart(2, "0")}T23:59:59${OFFSET_BRT}`),
  }
}
