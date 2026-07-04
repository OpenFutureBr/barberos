"use client"

import { useState } from "react"
import { CoresGrafico, CORES_PADRAO } from "@/lib/caixa-utils"
import { IconPaleta } from "./icons"

export default function SeletorCores({
  cores,
  onMudar,
  mostrarProjecao = true,
}: {
  cores: CoresGrafico
  onMudar: (cores: CoresGrafico) => void
  mostrarProjecao?: boolean
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 p-2 rounded-lg border border-zinc-700 transition-colors"
        title="Personalizar cores do gráfico"
      >
        <IconPaleta />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute right-0 mt-2 z-20 bg-zinc-900 border border-zinc-800 rounded-xl p-3 w-56 shadow-xl">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-2">Cores do gráfico</div>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm text-zinc-300">
                Entrada
                <input type="color" value={cores.entrada} onChange={(e) => onMudar({ ...cores, entrada: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border border-zinc-700" />
              </label>
              <label className="flex items-center justify-between text-sm text-zinc-300">
                Saída
                <input type="color" value={cores.saida} onChange={(e) => onMudar({ ...cores, saida: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border border-zinc-700" />
              </label>
              {mostrarProjecao && (
                <label className="flex items-center justify-between text-sm text-zinc-300">
                  Projeção
                  <input type="color" value={cores.projecao} onChange={(e) => onMudar({ ...cores, projecao: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border border-zinc-700" />
                </label>
              )}
            </div>
            <button
              onClick={() => onMudar({ ...CORES_PADRAO })}
              className="w-full mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Restaurar padrão
            </button>
          </div>
        </>
      )}
    </div>
  )
}
