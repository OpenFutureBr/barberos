export type TipoCaixa = "RECEITA" | "CUSTO" | "DESPESA"

export type Categoria = {
  label: string
  tipo: TipoCaixa
}

export type GrupoCategoria = {
  grupo: string
  cor: string // classe Tailwind para o badge
  categorias: Categoria[]
}

// Categorias de saída pré-existentes — usadas no lançamento manual (FAB) e
// exibidas como referência na aba Financeiro → Categorias.
export const GRUPOS_DESPESA: GrupoCategoria[] = [
  {
    grupo: "Pessoal",
    cor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    categorias: [
      { label: "Adiantamento para funcionário", tipo: "CUSTO" },
      { label: "Pagamento de salário",          tipo: "CUSTO" },
      { label: "Comissão",                      tipo: "CUSTO" },
      { label: "Férias / 13º salário",          tipo: "CUSTO" },
    ],
  },
  {
    grupo: "Fornecedores",
    cor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    categorias: [
      { label: "Compra de produtos",            tipo: "CUSTO" },
      { label: "Material de limpeza",           tipo: "CUSTO" },
      { label: "Equipamentos / Ferramentas",    tipo: "CUSTO" },
    ],
  },
  {
    grupo: "Contas",
    cor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    categorias: [
      { label: "Aluguel",                       tipo: "DESPESA" },
      { label: "Água / Luz / Gás",              tipo: "DESPESA" },
      { label: "Internet / Telefone",           tipo: "DESPESA" },
      { label: "Software / Sistema",            tipo: "DESPESA" },
    ],
  },
  {
    grupo: "Outros",
    cor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    categorias: [
      { label: "Marketing / Publicidade",       tipo: "DESPESA" },
      { label: "Impostos / Taxas",              tipo: "DESPESA" },
      { label: "Manutenção",                    tipo: "DESPESA" },
      { label: "Outros",                        tipo: "DESPESA" },
    ],
  },
]

// Categorias de entrada pré-existentes — mesma ideia, para receitas manuais.
export const GRUPOS_RECEITA: GrupoCategoria[] = [
  {
    grupo: "Atendimento",
    cor: "bg-green-500/10 text-green-400 border-green-500/20",
    categorias: [
      { label: "Corte / Serviço avulso", tipo: "RECEITA" },
      { label: "Produto",                tipo: "RECEITA" },
      { label: "Assinatura",             tipo: "RECEITA" },
      { label: "Domicílio",              tipo: "RECEITA" },
    ],
  },
  {
    grupo: "Outros",
    cor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    categorias: [
      { label: "Gorjeta",   tipo: "RECEITA" },
      { label: "Depósito",  tipo: "RECEITA" },
      { label: "Outros",    tipo: "RECEITA" },
    ],
  },
]

export const TIPO_BADGE: Record<TipoCaixa, string> = {
  CUSTO:   "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  DESPESA: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  RECEITA: "bg-green-500/10 text-green-400 border border-green-500/20",
}

export const TIPO_LABEL: Record<TipoCaixa, string> = {
  CUSTO:   "Custo",
  DESPESA: "Despesa",
  RECEITA: "Receita",
}
