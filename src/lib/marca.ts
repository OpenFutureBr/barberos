// Identidade visual da organizacao (White-label). Mora em
// Organization.orgConfig.marca — um campo Json que ja existia, entao nao ha
// migracao de schema envolvida. Ler/gravar pelo /api/org/config, que faz merge
// parcial (nao sobrescreve as outras chaves do orgConfig, como as playlists do
// painel de TV).

export type Marca = {
  nome: string
  slogan: string
  corPrimaria: string
  corSecundaria: string
  dominio: string
}

export const MARCA_PADRAO: Marca = {
  nome: "",
  slogan: "",
  corPrimaria: "",
  corSecundaria: "",
  dominio: "",
}

export function normalizarMarca(bruto: unknown): Marca {
  const m = (bruto ?? {}) as Partial<Record<keyof Marca, unknown>>
  const txt = (v: unknown) => (typeof v === "string" ? v : "")
  return {
    nome: txt(m.nome),
    slogan: txt(m.slogan),
    corPrimaria: corValida(txt(m.corPrimaria)) ? txt(m.corPrimaria) : "",
    corSecundaria: corValida(txt(m.corSecundaria)) ? txt(m.corSecundaria) : "",
    dominio: txt(m.dominio),
  }
}

const RE_HEX = /^#?([0-9a-f]{6})$/i

export function corValida(hex: string): boolean {
  return RE_HEX.test(hex.trim())
}

/**
 * Converte um hex sRGB para OKLCH (o mesmo espaco dos tokens em globals.css).
 * Retorna null se o hex nao for valido.
 *
 * Constantes de Bjorn Ottosson (a mesma matriz que a spec de css-color-4 usa).
 * Validado contra o acento "ouro": #f59e0b sai em L=0.769 / H=70.08, batendo
 * com o oklch(76.9% 0.188 70.08) escrito a mao no globals.css.
 */
export function hexParaOklch(hex: string): { l: number; c: number; h: number } | null {
  const m = RE_HEX.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)

  // sRGB com gamma -> linear
  const canal = (v: number) => {
    v /= 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const r = canal((n >> 16) & 255)
  const g = canal((n >> 8) & 255)
  const b = canal(n & 255)

  // linear -> LMS (raiz cubica) -> OKLab
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  const c = Math.sqrt(A * A + B * B)
  let h = (Math.atan2(B, A) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h }
}

// Croma maximo do acento. O mais saturado dos sete acentos nativos e o "ouro",
// em 0.188; deixar a marca passar muito disso faz a rampa inteira gritar,
// porque os tokens multiplicam esse croma por fatores de ate 1.0.
const CROMA_MAX = 0.19

/**
 * Reduz a cor da marca aos dois eixos que a rampa de acento usa: hue e croma.
 * A LUMINOSIDADE DO HEX E DESCARTADA de proposito — quem manda nela sao os
 * stops fixos do globals.css (--accent-500 sempre em 76.9% no escuro, etc.).
 * E o que mantem o contraste do texto previsivel com qualquer cor de marca:
 * uma marca amarelo-claro ou azul-marinho geram acentos igualmente legiveis.
 */
export function corParaEixoAcento(hex: string): { h: number; c: number } | null {
  const oklch = hexParaOklch(hex)
  if (!oklch) return null
  // Cinza puro nao tem hue definido — cai no hue do "onix" (monocromatico).
  if (oklch.c < 0.002) return { h: 286, c: 0 }
  return {
    h: Math.round(oklch.h * 100) / 100,
    c: Math.round(Math.min(oklch.c, CROMA_MAX) * 1000) / 1000,
  }
}
