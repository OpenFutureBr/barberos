// Skeleton genérico para estado de carregamento de página inteira
export default function PageSkeleton({ rows = 3, cards = 0 }: { rows?: number; cards?: number }) {
  return (
    <div className="animate-pulse space-y-4 p-1">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-5 bg-zinc-800 rounded-lg w-48" />
          <div className="h-3 bg-zinc-800 rounded w-32" />
        </div>
        <div className="h-9 bg-zinc-800 rounded-xl w-28" />
      </div>

      {/* Cards de KPI */}
      {cards > 0 && (
        <div className={`grid gap-3 mb-4`} style={{ gridTemplateColumns: `repeat(${cards}, 1fr)` }}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Linhas de conteúdo */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800/50 last:border-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
              <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
            </div>
            <div className="h-3 bg-zinc-800 rounded w-16 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Segunda seção */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-2xl" />
        <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-2xl" />
      </div>
    </div>
  )
}
