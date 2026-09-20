import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

// Altura minima em todas as variantes: no mobile um alvo de toque abaixo de
// ~44px erra muito (ver fase C do redesign). O `size="sm"` fica em 36px por
// ser usado em barras de acao densas no desktop.
export const estilosBotao = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        accent:  "bg-accent hover:bg-accent-hover text-accent-fg font-semibold",
        neutral: "bg-surface-2 hover:bg-surface-3 text-fg-strong border border-line",
        ghost:   "text-fg-2 hover:text-fg hover:bg-surface-2",
        danger:  "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
        success: "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20",
      },
      size: {
        sm: "text-xs px-3 min-h-9",
        md: "text-sm px-4 min-h-11",
        lg: "text-sm px-5 min-h-12",
      },
      full: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  }
)

export type PropsBotao = VariantProps<typeof estilosBotao>

export default function Button({
  variant, size, full, className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & PropsBotao) {
  return (
    <button
      // Sem type explicito, um botao dentro de <form> submete sem querer —
      // acontece muito nas paginas de configuracao deste projeto.
      type={props.type ?? "button"}
      className={cn(estilosBotao({ variant, size, full }), className)}
      {...props}
    />
  )
}

// Mesma aparencia para links (navegacao, WhatsApp, download).
export function ButtonLink({
  variant, size, full, className, ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & PropsBotao) {
  return <a className={cn(estilosBotao({ variant, size, full }), className)} {...props} />
}
