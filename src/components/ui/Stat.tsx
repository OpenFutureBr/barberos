import { cn } from "@/lib/cn"

const TONS = {
  neutral: "text-fg",
  accent:  "text-accent",
  success: "text-green-400",
  danger:  "text-red-400",
  info:    "text-blue-400",
} as const

// Tile de KPI no formato que o dashboard e o caixa ja usam: rotulo em caixa
// alta, valor grande, apoio embaixo.
export default function Stat({
  rotulo, valor, apoio, tone = "neutral", className,
}: {
  rotulo: React.ReactNode
  valor: React.ReactNode
  apoio?: React.ReactNode
  tone?: keyof typeof TONS
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface-1 shadow-sm shadow-black/5 p-4", className)}>
      <p className="text-fg-3 text-xs uppercase tracking-widest font-mono truncate">{rotulo}</p>
      <p className={cn("text-2xl font-bold mt-1.5 tabular-nums", TONS[tone])}>{valor}</p>
      {apoio && <p className="text-fg-4 text-xs mt-1">{apoio}</p>}
    </div>
  )
}
