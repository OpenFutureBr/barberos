import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

// Linhas suaves: raio maior (rounded-2xl), borda de 1px de baixo contraste e
// sombra discreta em vez de borda dura. `tone` cobre os cards de destaque que
// as paginas hoje montam a mao com bg-amber-500/10 + border-amber-500/20.
const estilosCartao = cva(
  "rounded-2xl border transition-colors",
  {
    variants: {
      tone: {
        surface: "bg-surface-1 border-line shadow-sm shadow-black/5",
        accent:  "bg-accent/10 border-accent/25",
        success: "bg-green-500/10 border-green-500/20",
        danger:  "bg-red-500/10 border-red-500/20",
        info:    "bg-blue-500/10 border-blue-500/20",
        ghost:   "bg-transparent border-line",
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-5 md:p-6",
      },
      interativo: {
        true: "hover:border-line-strong cursor-pointer",
      },
    },
    defaultVariants: { tone: "surface", padding: "md" },
  }
)

export default function Card({
  tone, padding, interativo, className, ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof estilosCartao>) {
  return <div className={cn(estilosCartao({ tone, padding, interativo }), className)} {...props} />
}

// Cabecalho de card: titulo a esquerda, acao a direita.
export function CardHeader({
  titulo, subtitulo, acao, divisor = false, className,
}: {
  titulo: React.ReactNode
  subtitulo?: React.ReactNode
  acao?: React.ReactNode
  divisor?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", divisor && "pb-3 mb-3 border-b border-line", className)}>
      <div className="min-w-0">
        <h2 className="text-fg text-sm font-semibold truncate">{titulo}</h2>
        {subtitulo && <p className="text-fg-3 text-xs mt-0.5">{subtitulo}</p>}
      </div>
      {acao && <div className="flex-shrink-0">{acao}</div>}
    </div>
  )
}

// Rotulo de secao no padrao que o sistema ja usa (mono, caixa alta, tracking).
export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-fg-3 text-xs uppercase tracking-widest font-mono", className)}>
      {children}
    </p>
  )
}
