"use client"

import { BucketPeriodo, CoresGrafico } from "@/lib/caixa-utils"

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function PeriodoGrid({
  buckets,
  granularidade,
  cores,
  selecionado,
  onSelecionar,
}: {
  buckets: BucketPeriodo[]
  granularidade: "hora" | "dia"
  cores: CoresGrafico
  selecionado?: string | null
  onSelecionar?: (chave: string | null) => void
}) {
  if (buckets.length === 0) {
    return <div className="py-12 text-center text-zinc-600 text-sm">Sem dados no período</div>
  }

  function Celula({ b }: { b: BucketPeriodo }) {
    const ativo = selecionado === b.chave
    const tiposEntrada = Object.entries(b.porTipoEntrada)
    const tiposSaida = Object.entries(b.porTipoSaida)
    const semMovimento = b.entradas === 0 && b.saidas === 0

    return (
      <button
        onClick={() => onSelecionar?.(ativo ? null : b.chave)}
        className={`text-left rounded-lg border p-2 transition-colors ${
          ativo ? "border-amber-500 bg-amber-500/5" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
        } ${semMovimento ? "opacity-50" : ""}`}
        title={[...tiposEntrada.map(([t, v]) => `+ ${t}: ${fmtMoeda(v)}`), ...tiposSaida.map(([t, v]) => `- ${t}: ${fmtMoeda(v)}`)].join("\n") || "Sem movimento"}
      >
        <div className="text-zinc-500 text-[10px] font-mono uppercase mb-1">{b.label}</div>
        {!semMovimento ? (
          <div className="space-y-0.5">
            {b.entradas > 0 && (
              <div className="text-xs font-mono font-semibold" style={{ color: cores.entrada }}>
                +{fmtMoeda(b.entradas)}
              </div>
            )}
            {b.saidas > 0 && (
              <div className="text-xs font-mono font-semibold" style={{ color: cores.saida }}>
                −{fmtMoeda(b.saidas)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-zinc-700 text-xs">—</div>
        )}
      </button>
    )
  }

  if (granularidade === "hora") {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {buckets.map((b) => (
          <Celula key={b.chave} b={b} />
        ))}
      </div>
    )
  }

  // Granularidade diária — layout de calendário (colunas = dia da semana)
  const primeiraOffset = buckets[0]?.diaSemana ?? 0
  const celulasVazias = Array.from({ length: primeiraOffset })

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-zinc-600 text-[10px] font-mono uppercase text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {celulasVazias.map((_, i) => (
          <div key={`vazio-${i}`} />
        ))}
        {buckets.map((b) => (
          <Celula key={b.chave} b={b} />
        ))}
      </div>
    </div>
  )
}
