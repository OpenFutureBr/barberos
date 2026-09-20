// Tema do sistema em tres eixos independentes, todos gravados como atributo no
// <html> e lidos pelos tokens em globals.css:
//
//   data-mode    escuro | claro     ("sistema" e resolvido aqui, via matchMedia)
//   data-accent  cor da marca
//   data-tone    temperatura das superficies (frio/neutro/quente)
//
// A preferencia e do USUARIO e por dispositivo (localStorage). A cor da marca
// definida no White-label entra como o acento "marca": ela e o PADRAO da
// organizacao, mas uma escolha explicita no dispositivo vence — e por isso que
// lerTema() distingue "nunca escolhi" (chave ausente) de "escolhi ouro".

export type Modo = "escuro" | "claro" | "sistema"
export type ModoReal = "escuro" | "claro"
export type Acento = "ouro" | "bronze" | "rose" | "nude" | "lavanda" | "esmeralda" | "onix" | "marca"
export type Tom = "neutro" | "quente" | "frio"

export type Tema = { modo: Modo; acento: Acento; tom: Tom }

export const CHAVE_MODO = "tema"
export const CHAVE_ACENTO = "tema-acento"
export const CHAVE_TOM = "tema-tom"

// Cache local do eixo [hue, croma] derivado da cor da marca (White-label).
// Existe so pelo primeiro paint: a cor vive no banco (orgConfig.marca), mas o
// script de boot nao pode esperar um fetch, senao a tela pisca no acento
// errado. Quem preenche e o AplicadorMarca, depois de ler /api/org/config.
export const CHAVE_MARCA_HC = "tema-marca-hc"

export const TEMA_PADRAO: Tema = { modo: "escuro", acento: "ouro", tom: "neutro" }

export const MODOS: { id: Modo; label: string }[] = [
  { id: "claro", label: "Claro" },
  { id: "escuro", label: "Escuro" },
  { id: "sistema", label: "Sistema" },
]

// `amostra` e a cor do swatch no seletor — o mesmo stop 500 que o token gera.
export const ACENTOS: { id: Acento; label: string; descricao: string; amostra: string }[] = [
  { id: "ouro",      label: "Ouro",      descricao: "Padrao BarberOS",      amostra: "oklch(76.9% 0.188 70.08)" },
  { id: "bronze",    label: "Bronze",    descricao: "Barbearia classica",   amostra: "oklch(76.9% 0.115 52)" },
  { id: "rose",      label: "Rose",      descricao: "Salao feminino",       amostra: "oklch(76.9% 0.115 14)" },
  { id: "nude",      label: "Nude",      descricao: "Champagne discreto",   amostra: "oklch(76.9% 0.055 62)" },
  { id: "lavanda",   label: "Lavanda",   descricao: "Estetica e beleza",    amostra: "oklch(76.9% 0.100 300)" },
  { id: "esmeralda", label: "Esmeralda", descricao: "Verde sobrio",         amostra: "oklch(76.9% 0.105 163)" },
  { id: "onix",      label: "Onix",      descricao: "Monocromatico",        amostra: "oklch(76.9% 0.022 286)" },
]

export const TONS: { id: Tom; label: string; descricao: string }[] = [
  { id: "frio",   label: "Frio",   descricao: "Cinza azulado" },
  { id: "neutro", label: "Neutro", descricao: "Cinza puro" },
  { id: "quente", label: "Quente", descricao: "Bege / greige" },
]

// "marca" nao entra em ACENTOS (o swatch dela depende da cor vinda do banco,
// entao quem monta a opcao e o SeletorTema), mas e um valor valido de leitura.
const ACENTOS_VALIDOS: Acento[] = [...ACENTOS.map(a => a.id), "marca"]
const TONS_VALIDOS = TONS.map(t => t.id)

// Cor da barra de status do navegador/PWA por modo. Nao usa o token direto
// porque o valor computado sai em oklch(), que nem todo navegador aceita em
// <meta name="theme-color">.
const META_THEME: Record<ModoReal, string> = { escuro: "#18181b", claro: "#f7f7f8" }

function ler(chave: string): string | null {
  try { return localStorage.getItem(chave) } catch { return null }
}

export type EixoMarca = { h: number; c: number }

export function lerEixoMarca(): EixoMarca | null {
  const bruto = ler(CHAVE_MARCA_HC)
  if (!bruto) return null
  try {
    const [h, c] = JSON.parse(bruto)
    if (typeof h !== "number" || typeof c !== "number") return null
    return { h, c }
  } catch { return null }
}

// Chamado pelo AplicadorMarca quando a cor da organizacao carrega ou muda.
// Passar null limpa o cache (a organizacao apagou a cor da marca).
export function salvarEixoMarca(eixo: EixoMarca | null) {
  try {
    if (eixo) localStorage.setItem(CHAVE_MARCA_HC, JSON.stringify([eixo.h, eixo.c]))
    else localStorage.removeItem(CHAVE_MARCA_HC)
  } catch {}
}

export function lerTema(): Tema {
  const bruto = ler(CHAVE_MODO)
  // Compatibilidade com o formato antigo, que gravava "dark" | "light".
  const modo: Modo =
    bruto === "claro" || bruto === "light" ? "claro" :
    bruto === "sistema" ? "sistema" : "escuro"

  const acento = ler(CHAVE_ACENTO) as Acento | null
  const tom = ler(CHAVE_TOM) as Tom | null

  // Chave ausente = o usuario nunca escolheu acento neste dispositivo, entao
  // manda a marca da organizacao (se houver). Uma escolha explicita — inclusive
  // "ouro" — e respeitada.
  const padraoAcento: Acento = lerEixoMarca() ? "marca" : TEMA_PADRAO.acento

  return {
    modo,
    acento: acento && ACENTOS_VALIDOS.includes(acento) ? acento : padraoAcento,
    tom: tom && TONS_VALIDOS.includes(tom) ? tom : TEMA_PADRAO.tom,
  }
}

export function prefereEscuro(): boolean {
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches } catch { return true }
}

export function modoReal(modo: Modo): ModoReal {
  if (modo === "sistema") return prefereEscuro() ? "escuro" : "claro"
  return modo
}

let timerTransicao: ReturnType<typeof setTimeout> | undefined

export function aplicarTema(tema: Tema, comTransicao = false) {
  const el = document.documentElement
  const real = modoReal(tema.modo)

  // A meta e sempre sincronizada: no primeiro carregamento ela vem com o valor
  // estatico do modo escuro (definido em layout.tsx), que estaria errado para
  // quem usa o modo claro — o script de boot nao mexe nela.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", META_THEME[real])

  // Resquicio do tema antigo por inversao: se a classe sobrar em algum DOM
  // cacheado, a pagina inteira aparece invertida.
  el.classList.remove("light")

  // O acento "marca" nao tem regra [data-accent="..."] no CSS: os dois eixos
  // entram como style inline, que vence a cascata. Isso roda ANTES do retorno
  // por "sem mudanca" abaixo, senao trocar so a cor da marca (com o acento
  // continuando "marca") nao repintaria nada.
  if (tema.acento === "marca") {
    const eixo = lerEixoMarca()
    if (eixo) {
      el.style.setProperty("--a-h", String(eixo.h))
      el.style.setProperty("--a-c", String(eixo.c))
    }
  } else {
    el.style.removeProperty("--a-h")
    el.style.removeProperty("--a-c")
  }

  const semMudanca =
    el.dataset.mode === real &&
    el.dataset.accent === tema.acento &&
    el.dataset.tone === tema.tom
  if (semMudanca) return

  if (comTransicao) {
    el.classList.add("tema-trocando")
    clearTimeout(timerTransicao)
    timerTransicao = setTimeout(() => el.classList.remove("tema-trocando"), 300)
  }

  el.dataset.mode = real
  el.dataset.accent = tema.acento
  el.dataset.tone = tema.tom
}

export function salvarTema(parcial: Partial<Tema>): Tema {
  const atual = lerTema()
  const novo: Tema = { ...atual, ...parcial }
  try {
    localStorage.setItem(CHAVE_MODO, novo.modo)
    localStorage.setItem(CHAVE_ACENTO, novo.acento)
    localStorage.setItem(CHAVE_TOM, novo.tom)
  } catch {}
  aplicarTema(novo, true)
  window.dispatchEvent(new CustomEvent("temaAlterado", { detail: novo }))
  return novo
}

// Script que roda antes do primeiro paint (injetado no <head> pelo layout).
// Duplica a logica de lerTema/aplicarTema de proposito: nao pode depender de
// nenhum bundle, senao a tela pisca no tema errado.
export const SCRIPT_TEMA_BOOT = `
try{
var d=document.documentElement,g=function(k,f){try{return localStorage.getItem(k)||f}catch(e){return f}};
var m=g(${JSON.stringify(CHAVE_MODO)},"escuro");
if(m==="dark")m="escuro";
if(m==="light")m="claro";
if(m==="sistema")m=window.matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro";
if(m!=="claro")m="escuro";
d.dataset.mode=m;
var hc=null;try{var _h=JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE_MARCA_HC)}));if(_h&&_h.length===2&&typeof _h[0]==="number")hc=_h;}catch(e){}
var a=g(${JSON.stringify(CHAVE_ACENTO)},hc?"marca":"ouro");
d.dataset.accent=a;
if(a==="marca"&&hc){d.style.setProperty("--a-h",""+hc[0]);d.style.setProperty("--a-c",""+hc[1]);}
d.dataset.tone=g(${JSON.stringify(CHAVE_TOM)},"neutro");
d.classList.remove("light");
}catch(e){}
`.replace(/\n/g, "")
