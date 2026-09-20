import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const estilosBadge = cva(
  "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 border-line text-fg-2",
        accent:  "bg-accent/10 border-accent/25 text-accent",
        success: "bg-green-500/10 border-green-500/20 text-green-400",
        danger:  "bg-red-500/10 border-red-500/20 text-red-400",
        warning: "bg-orange-500/10 border-orange-500/20 text-orange-400",
        info:    "bg-blue-500/10 border-blue-500/20 text-blue-400",
      },
      size: {
        sm: "text-[11px] px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  }
)

export default function Badge({
  tone, size, className, ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof estilosBadge>) {
  return <span className={cn(estilosBadge({ tone, size }), className)} {...props} />
}
