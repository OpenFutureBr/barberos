"use client"

import { BucketPeriodo, CoresGrafico } from "@/lib/caixa-utils"

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function PeriodoGrafico({
  buckets,
  cores,
  mostrarProjecao,
  selecionado,
  onSelecionar,
  onMudarCor,
}: {
  buckets: BucketPeriodo[]
  cores: CoresGrafico
  mostrarProjecao?: boolean
  selecionado?: string | null
  onSelecionar?: (chave: string | null) => void
  onMudarCor?: (serie: keyof CoresGrafico, cor: string) => void
}) {
  if (buckets.length === 0) {
    return <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">Sem dados no período</div>
  }

  const maxValor = Math.max(
    ...buckets.map((b) => Math.max(b.entradas, b.saidas, mostrarProjecao ? b.projecao ?? 0 : 0)),
    1,
  )

  return (
    <>
      <div className="flex items-end gap-3 h-64 overflow-x-auto pb-2">
        {buckets.map((b) => {
          const ativo = selecionado === b.chave
          return (
            <div
              key={b.chave}
              onClick={() => onSelecionar?.(ativo ? null : b.chave)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer rounded-md px-1 pt-1 transition-colors ${ativo ? "bg-amber-500/10 ring-1 ring-amber-500/40" : "hover:bg-zinc-800/40"}`}
              style={{ minWidth: 56 }}
            >
              <div className="flex items-end gap-0.5" style={{ height: 200 }}>
                <div
                  className="w-3 rounded-t transition-all"
                  style={{ height: `${Math.max(2, (b.entradas / maxValor) * 100)}%`, backgroundColor: cores.entrada, opacity: b.entradas > 0 ? 0.85 : 0.15 }}
                  title={`Entradas: ${fmtMoeda(b.entradas)}`}
                />
                <div
                  className="w-3 rounded-t transition-all"
                  style={{ height: `${Math.max(2, (b.saidas / maxValor) * 100)}%`, backgroundColor: cores.saida, opacity: b.saidas > 0 ? 0.85 : 0.15 }}
                  title={`Saídas: ${fmtMoeda(b.saidas)}`}
                />
                {mostrarProjecao && (
                  <div
                    className="w-3 rounded-t border border-dashed transition-all"
                    style={{
                      height: `${Math.max(2, ((b.projecao ?? 0) / maxValor) * 100)}%`,
                      backgroundColor: `${cores.projecao}80`,
                      borderColor: cores.projecao,
                      opacity: (b.projecao ?? 0) > 0 ? 0.85 : 0.15,
                    }}
                    title={`Projeção: ${fmtMoeda(b.projecao ?? 0)}`}
                  />
                )}
              </div>
              <div className={`text-[10px] font-mono whitespace-nowrap ${ativo ? "text-amber-400" : "text-zinc-600"}`}>{b.label}</div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer group" title="Clique para mudar a cor">
          <div className="relative w-2.5 h-2.5">
            <div className="w-2.5 h-2.5 rounded-sm ring-1 ring-transparent group-hover:ring-zinc-500 transition-all" style={{ backgroundColor: cores.entrada }} />
            <input
              type="color"
              value={cores.entrada}
              onChange={(e) => onMudarCor?.("entrada", e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">Entradas</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer group" title="Clique para mudar a cor">
          <div className="relative w-2.5 h-2.5">
            <div className="w-2.5 h-2.5 rounded-sm ring-1 ring-transparent group-hover:ring-zinc-500 transition-all" style={{ backgroundColor: cores.saida }} />
            <input
              type="color"
              value={cores.saida}
              onChange={(e) => onMudarCor?.("saida", e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">Saídas</span>
        </label>
        {mostrarProjecao && (
          <label className="flex items-center gap-1.5 cursor-pointer group" title="Clique para mudar a cor">
            <div className="relative w-2.5 h-2.5">
              <div className="w-2.5 h-2.5 rounded-sm border border-dashed ring-1 ring-transparent group-hover:ring-zinc-500 transition-all" style={{ backgroundColor: `${cores.projecao}80`, borderColor: cores.projecao }} />
              <input
                type="color"
                value={cores.projecao}
                onChange={(e) => onMudarCor?.("projecao", e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
            <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">Projeção</span>
          </label>
        )}
        {selecionado && (
          <button onClick={() => onSelecionar?.(null)} className="ml-auto text-amber-400 hover:text-amber-300 text-xs transition-colors">
            Limpar seleção ×
          </button>
        )}
      </div>
    </>
  )
}
