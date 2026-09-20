import { RESOURCES } from "@/lib/resources"

// Indice da busca global (Ctrl+K). Reaproveita RESOURCES como catalogo de
// navegacao e acrescenta as ACOES, que sao disparadas pelos mesmos eventos de
// window que o app ja usa (o Topbar e o GlobalFAB disparam os mesmos) — assim
// a paleta nao duplica nenhuma regra de negocio.

export type ItemPaleta = {
  /** Chave estavel: e o que vai pro localStorage de favoritos e de visitas. */
  id: string
  label: string
  grupo: string
  /** Slug de permissao (mesmo vocabulario de allowedResources). */
  resource: string
  /** Restricao de plano, quando houver. */
  feature?: string
  tipo: "navegacao" | "acao"
  /** tipo "navegacao": destino. */
  path?: string
  /** tipo "acao": evento de window a disparar. */
  evento?: string
  /**
   * tipo "acao": rota que precisa estar aberta para alguem escutar o evento.
   * `abrirNovoProduto` e `abrirEntradaMercadoria` sao ouvidos pela pagina de
   * estoque, nao pelo shell — sem navegar primeiro, o evento cai no vazio.
   */
  rotaNecessaria?: string
  /** Sinonimos: o que o usuario provavelmente digita e nao esta no label. */
  sinonimos?: string[]
}

const ACOES: ItemPaleta[] = [
  {
    id: "acao:agendar",
    label: "Novo agendamento",
    grupo: "Ações",
    resource: "agenda",
    tipo: "acao",
    evento: "abrirModalAgenda",
    sinonimos: ["agendar", "marcar horario", "novo horario", "reserva"],
  },
  {
    id: "acao:venda",
    label: "Registrar venda",
    grupo: "Ações",
    resource: "caixa",
    tipo: "acao",
    evento: "abrirVenda",
    sinonimos: ["vender", "comanda", "pdv", "carrinho"],
  },
  {
    id: "acao:novo-produto",
    label: "Novo produto",
    grupo: "Ações",
    resource: "estoque",
    tipo: "acao",
    evento: "abrirNovoProduto",
    rotaNecessaria: "/dashboard/estoque",
    sinonimos: ["cadastrar produto", "adicionar produto"],
  },
  {
    id: "acao:entrada-mercadoria",
    label: "Entrada de mercadoria",
    grupo: "Ações",
    resource: "estoque",
    tipo: "acao",
    evento: "abrirEntradaMercadoria",
    rotaNecessaria: "/dashboard/estoque",
    sinonimos: ["compra", "reposicao", "receber mercadoria", "nota de entrada"],
  },
]

// Sinonimos de navegacao: termos que o usuario busca mas que nao aparecem no
// label do recurso (ex.: quem procura "NF-e" quer Fiscal).
const SINONIMOS_NAV: Record<string, string[]> = {
  dashboard: ["inicio", "home", "visao geral"],
  agenda: ["agendamentos", "horarios", "calendario"],
  fila: ["espera", "senha"],
  clientes: ["cadastro de clientes", "cliente"],
  servicos: ["cortes", "precos de servico"],
  equipe: ["barbeiros", "funcionarios", "profissionais"],
  estoque: ["produtos", "inventario"],
  caixa: ["abertura de caixa", "fechamento", "sangria"],
  financeiro: ["relatorios", "faturamento", "receita", "despesas"],
  fiscal: ["nfe", "nf-e", "nota fiscal", "imposto"],
  precificacao: ["precos", "margem", "custo"],
  pix: ["cobranca", "qr code", "pagamento"],
  cashback: ["gift card", "credito", "fidelidade"],
  assinaturas: ["planos", "mensalidade", "recorrencia"],
  whatsapp: ["zap", "mensagens", "automacao"],
  unidades: ["filiais", "lojas", "multi unidades"],
  white_label: ["marca", "identidade visual", "cores", "logo", "dominio"],
  configuracoes: ["ajustes", "preferencias", "tema", "aparencia"],
  permissoes: ["acessos", "usuarios", "cargos"],
  ajuda: ["suporte", "faq", "duvidas"],
  api_docs: ["api", "integracao", "webhook"],
  painel_tv: ["tv", "televisao", "painel"],
  ia_estoque: ["ia", "inteligencia artificial"],
  ia_biotipo: ["ia", "rosto", "biotipo"],
  clientes_ia: ["ia", "central ia"],
  domicilio: ["atendimento externo", "delivery"],
  bancada: ["materiais", "insumos"],
}

// `feature` precisa casar com MENU_GROUPS, senao a paleta ofereceria algo que
// o plano do cliente nao libera. Hoje so o Painel TV e as telas de IA tem.
const FEATURE_POR_SLUG: Record<string, string> = {
  painel_tv: "painel_tv",
  ia_estoque: "ia",
  ia_biotipo: "ia",
  clientes_ia: "ia",
}

export const ITENS_PALETA: ItemPaleta[] = [
  ...RESOURCES.map<ItemPaleta>(r => ({
    id: `nav:${r.slug}`,
    label: r.label,
    grupo: r.group,
    resource: r.slug,
    feature: FEATURE_POR_SLUG[r.slug],
    tipo: "navegacao",
    path: r.path,
    sinonimos: SINONIMOS_NAV[r.slug],
  })),
  ...ACOES,
]

/* ---------------------------------- busca --------------------------------- */

/** Sem acento e em minusculas: "precificacao" tem que achar "Precificação". */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

// Subsequencia: "prcf" acha "precificacao". Vale menos que um trecho literal,
// e quanto mais espalhadas as letras, menor a pontuacao.
function pontuarSubsequencia(alvo: string, busca: string): number {
  let i = 0
  let primeira = -1
  let ultima = -1
  for (let j = 0; j < alvo.length && i < busca.length; j++) {
    if (alvo[j] === busca[i]) {
      if (primeira < 0) primeira = j
      ultima = j
      i++
    }
  }
  if (i < busca.length) return 0
  const dispersao = ultima - primeira + 1
  return Math.max(1, 20 - Math.round((dispersao / Math.max(busca.length, 1)) * 4))
}

/**
 * Pontua um item contra a busca. 0 = nao casa.
 * O label vale mais que o grupo, que vale mais que os sinonimos — buscar
 * "agenda" tem que trazer a Agenda antes de "Novo agendamento".
 */
export function pontuar(item: ItemPaleta, busca: string): number {
  const q = normalizar(busca)
  if (!q) return 1

  const label = normalizar(item.label)
  if (label === q) return 1000
  if (label.startsWith(q)) return 500
  if (label.split(/\s+/).some(p => p.startsWith(q))) return 300
  if (label.includes(q)) return 200

  for (const s of item.sinonimos ?? []) {
    const n = normalizar(s)
    if (n.startsWith(q)) return 120
    if (n.includes(q)) return 90
  }

  if (normalizar(item.grupo).startsWith(q)) return 60

  return pontuarSubsequencia(label, q)
}

export function buscar(itens: ItemPaleta[], busca: string): ItemPaleta[] {
  if (!normalizar(busca)) return itens
  return itens
    .map(item => ({ item, p: pontuar(item, busca) }))
    .filter(x => x.p > 0)
    .sort((a, b) => b.p - a.p || a.item.label.localeCompare(b.item.label, "pt-BR"))
    .map(x => x.item)
}

/* ----------------------- favoritos e frequencia (local) -------------------- */

// Por usuario e por dispositivo: duas pessoas no mesmo computador (comum numa
// barbearia com um caixa compartilhado) nao herdam os favoritos uma da outra.
const chaveFavoritos = (usuario: string) => `paleta-favoritos:${usuario}`
const chaveVisitas = (usuario: string) => `paleta-visitas:${usuario}`

/** Avisa a UI que favoritos/visitas mudaram (o store da paleta ouve isso). */
export const EVENTO_PALETA = "paletaAlterada"

function avisar() {
  try { window.dispatchEvent(new CustomEvent(EVENTO_PALETA)) } catch {}
}

export function lerFavoritos(usuario: string): string[] {
  if (!usuario) return []
  try {
    const bruto = localStorage.getItem(chaveFavoritos(usuario))
    const v = bruto ? JSON.parse(bruto) : null
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch { return [] }
}

export function alternarFavorito(usuario: string, id: string): string[] {
  if (!usuario) return []
  const atuais = lerFavoritos(usuario)
  const novos = atuais.includes(id) ? atuais.filter(x => x !== id) : [...atuais, id]
  try { localStorage.setItem(chaveFavoritos(usuario), JSON.stringify(novos)) } catch {}
  avisar()
  return novos
}

export function lerVisitas(usuario: string): Record<string, number> {
  if (!usuario) return {}
  try {
    const bruto = localStorage.getItem(chaveVisitas(usuario))
    const v = bruto ? JSON.parse(bruto) : null
    if (!v || typeof v !== "object" || Array.isArray(v)) return {}
    const saida: Record<string, number> = {}
    for (const [k, n] of Object.entries(v)) if (typeof n === "number") saida[k] = n
    return saida
  } catch { return {} }
}

export function registrarVisita(usuario: string, id: string) {
  if (!usuario || !id) return
  const v = lerVisitas(usuario)
  v[id] = (v[id] ?? 0) + 1
  try { localStorage.setItem(chaveVisitas(usuario), JSON.stringify(v)) } catch {}
  avisar()
}

/** Mais visitados primeiro, ignorando quem ja esta nos favoritos. */
export function maisFrequentes(
  usuario: string,
  itens: ItemPaleta[],
  favoritos: string[],
  limite = 5,
): ItemPaleta[] {
  const visitas = lerVisitas(usuario)
  return itens
    .filter(i => (visitas[i.id] ?? 0) > 0 && !favoritos.includes(i.id))
    .sort((a, b) => (visitas[b.id] ?? 0) - (visitas[a.id] ?? 0))
    .slice(0, limite)
}

/** Item correspondente a uma rota, pra contar a visita ao navegar. */
export function itemPorPath(pathname: string): ItemPaleta | null {
  const navs = ITENS_PALETA.filter(i => i.tipo === "navegacao" && i.path)
  // Mais especifico primeiro: "/dashboard" e prefixo de todas as subpaginas.
  const ordenados = [...navs].sort((a, b) => (b.path!.length - a.path!.length))
  return ordenados.find(i => pathname === i.path || pathname.startsWith(i.path + "/")) ?? null
}
