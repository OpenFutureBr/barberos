export type Resource = {
  slug: string
  label: string
  path: string
  group: string
}

export const RESOURCES: Resource[] = [
  { slug: "dashboard",    label: "Dashboard",         path: "/dashboard",            group: "Principal" },
  { slug: "agenda",       label: "Agenda",             path: "/dashboard/agenda",     group: "Principal" },
  { slug: "fila",         label: "Fila de Espera",     path: "/dashboard/fila",       group: "Principal" },
  { slug: "painel_tv",    label: "Painel TV",          path: "/dashboard/painel-tv",  group: "Principal" },
  { slug: "clientes",     label: "Clientes",           path: "/dashboard/clientes",   group: "Gestão" },
  { slug: "servicos",     label: "Serviços",           path: "/dashboard/servicos",   group: "Gestão" },
  { slug: "galeria",      label: "Galeria de Cortes",  path: "/dashboard/galeria",    group: "Gestão" },
  { slug: "equipe",       label: "Equipe",             path: "/dashboard/equipe",     group: "Gestão" },
  { slug: "estoque",      label: "Estoque",            path: "/dashboard/estoque",    group: "Gestão" },
  { slug: "ia_estoque",   label: "IA Estoque",         path: "/dashboard/estoque-ia", group: "Gestão" },
  { slug: "domicilio",    label: "Domicílio",          path: "/dashboard/domicilio",  group: "Gestão" },
  { slug: "ia_biotipo",   label: "IA Biotipo",         path: "/dashboard/ia-biotipo", group: "Gestão" },
  { slug: "pix",          label: "PIX & Cobranças",    path: "/dashboard/pix",        group: "Financeiro" },
  { slug: "caixa",        label: "Caixa",              path: "/dashboard/caixa",      group: "Financeiro" },
  { slug: "financeiro",   label: "Financeiro",         path: "/dashboard/financeiro", group: "Financeiro" },
  { slug: "fiscal",       label: "Fiscal & NF-e",      path: "/dashboard/fiscal",     group: "Financeiro" },
  { slug: "precificacao", label: "Precificação",       path: "/dashboard/precificacao", group: "Financeiro" },
  { slug: "cashback",     label: "Cashback",           path: "/dashboard/cashback",   group: "Fidelidade" },
  { slug: "assinaturas",  label: "Assinaturas",        path: "/dashboard/assinaturas", group: "Fidelidade" },
  { slug: "clientes_ia",  label: "Central IA",         path: "/dashboard/clientes-ia", group: "Fidelidade" },
  { slug: "whatsapp",     label: "WhatsApp",           path: "/dashboard/whatsapp",   group: "Comunicação" },
  { slug: "configuracoes", label: "Configurações",     path: "/dashboard/configuracoes", group: "Sistema" },
]

export function pathToSlug(pathname: string): string | null {
  const r = RESOURCES.find(r => pathname === r.path || pathname.startsWith(r.path + "/"))
  return r?.slug ?? null
}
