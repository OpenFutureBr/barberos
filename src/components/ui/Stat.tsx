import Link from "next/link"
import { cn } from "@/lib/cn"
import CardCarousel from "./CardCarousel"

// Cor do valor (e, com `destaque`, do cartao inteiro). `apagado` e para um
// zero que nao merece atencao (ex.: "Em atraso: 0").
const TONS = {
  neutral: { valor: "text-fg",        tinta: "bg-surface-2 border-line",               rotulo: "text-fg-3" },
  apagado: { valor: "text-fg-4",      tinta: "bg-surface-2 border-line",               rotulo: "text-fg-3" },
  accent:  { valor: "text-accent",    tinta: "bg-accent/5 border-accent/20",           rotulo: "text-accent" },
  success: { valor: "text-green-400", tinta: "bg-green-500/5 border-green-500/20",     rotulo: "text-green-400" },
  danger:  { valor: "text-red-400",   tinta: "bg-red-500/5 border-red-500/20",         rotulo: "text-red-400" },
  warning: { valor: "text-orange-400", tinta: "bg-orange-500/5 border-orange-500/20",  rotulo: "text-orange-400" },
  info:    { valor: "text-blue-400",  tinta: "bg-blue-500/5 border-blue-500/20",       rotulo: "text-blue-400" },
  teal:    { valor: "text-teal-400",  tinta: "bg-teal-500/5 border-teal-500/20",       rotulo: "text-teal-400" },
  purple:  { valor: "text-purple-400", tinta: "bg-purple-500/5 border-purple-500/20",  rotulo: "text-purple-400" },
} as const

export type TomStat = keyof typeof TONS

// Tile de KPI: rotulo em caixa alta, valor grande, apoio embaixo. Antes cada
// pagina montava o seu, com tres estilos (neutro, neutro com faixa no topo,
// tingido) e valor de text-lg a text-3xl. `destaque` e o tingido — para o
// numero principal da tela, nao para todos.
export default function Stat({
  rotulo, valor, apoio, tone = "neutral", destaque = false, carregando = false, onClick, href, className,
}: {
  rotulo: React.ReactNode
  valor: React.ReactNode
  apoio?: React.ReactNode
  tone?: TomStat
  destaque?: boolean
  carregando?: boolean
  onClick?: () => void
  /** Cartao inteiro vira link (ex.: "A receber" leva as cobrancas) */
  href?: string
  className?: string
}) {
  const t = TONS[tone]
  const classes = cn(
    "rounded-2xl border p-4 h-full w-full text-left",
    destaque ? t.tinta : "bg-surface-1 border-line shadow-sm shadow-black/5",
    (onClick || href) && "hover:border-line-strong transition-colors cursor-pointer block",
    className
  )
  const conteudo = (
    <>
      <p className={cn("text-xs uppercase tracking-widest font-mono truncate", destaque ? t.rotulo : "text-fg-3")}>{rotulo}</p>
      {carregando
        ? <div className="h-8 mt-1.5 rounded-lg bg-surface-3 animate-pulse" />
        // div, nao p: ha valores compostos (numero + "+2 fila")
        : <div className={cn("text-2xl font-bold mt-1.5 tabular-nums truncate", t.valor)}>{valor}</div>}
      {apoio && <div className="text-fg-4 text-xs mt-1">{apoio}</div>}
    </>
  )

  if (href) return <Link href={href} className={classes}>{conteudo}</Link>
  return onClick
    ? <button type="button" onClick={onClick} className={classes}>{conteudo}</button>
    : <div className={classes}>{conteudo}</div>
}

// Classes literais: o Tailwind so gera o que aparece escrito no codigo.
const COLUNAS = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
} as const

// Fileira de KPIs: carrossel com swipe no celular, grade no desktop. Junta o
// par <CardCarousel> + <div className="hidden md:grid ..."> que cada pagina
// repetia (e que precisava manter os dois em sincronia).
export function KpiGrid({ colunas, children, className }: {
  colunas: keyof typeof COLUNAS
  children: React.ReactNode[]
  className?: string
}) {
  return (
    <div className={className}>
      <CardCarousel cards={children} />
      <div className={cn("hidden md:grid gap-3", COLUNAS[colunas])}>{children}</div>
    </div>
  )
}
