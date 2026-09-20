import { cn } from "@/lib/cn"

export default function EmptyState({
  icone, titulo, descricao, acao, className,
}: {
  icone?: React.ReactNode
  titulo: React.ReactNode
  descricao?: React.ReactNode
  acao?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-12", className)}>
      {icone && <div className="text-fg-4 text-3xl mb-3">{icone}</div>}
      <p className="text-fg-2 text-sm font-medium">{titulo}</p>
      {descricao && <p className="text-fg-4 text-xs mt-1 max-w-xs">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}
