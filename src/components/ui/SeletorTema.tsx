"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  ACENTOS, MODOS, TONS,
  aplicarTema, lerEixoMarca, lerTema, modoReal, salvarTema,
  type Acento, type Modo, type Tema, type Tom,
} from "@/lib/tema"

/* ---------------------------------------------------------------------------
   Estado do tema. O localStorage e a fonte da verdade — um store externo —,
   entao a leitura vai por useSyncExternalStore em vez de useState+useEffect:
   isso mantem varias abas e o PWA em sincronia sem render em cascata.

   O snapshot e uma string (nao um objeto) porque useSyncExternalStore compara
   por identidade; devolver um objeto novo a cada chamada causaria loop. O modo
   resolvido entra na chave para que, com modo "sistema", a troca de tema do SO
   tambem invalide o snapshot.
   --------------------------------------------------------------------------- */

function assinarTema(aoMudar: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  window.addEventListener("temaAlterado", aoMudar)
  window.addEventListener("storage", aoMudar)
  mq.addEventListener("change", aoMudar)
  return () => {
    window.removeEventListener("temaAlterado", aoMudar)
    window.removeEventListener("storage", aoMudar)
    mq.removeEventListener("change", aoMudar)
  }
}

function snapshotTema() {
  const t = lerTema()
  // O 5o campo e o eixo da cor da marca ("h:c", ou vazio se a organizacao nao
  // definiu nenhuma). Entra na chave pra opcao "Marca" aparecer/atualizar sem
  // recarregar, assim que o AplicadorMarca termina de ler a API.
  const m = lerEixoMarca()
  return `${t.modo}|${t.acento}|${t.tom}|${modoReal(t.modo)}|${m ? `${m.h}:${m.c}` : ""}`
}

// No servidor nao ha localStorage: assume o padrao, igual ao script de boot.
function snapshotServidor() {
  return "escuro|ouro|neutro|escuro|"
}

// Lista de acentos oferecida ao usuario: os sete nativos, com a cor da marca
// na frente quando existe. A amostra dela e montada com os mesmos numeros que
// o token --accent-500 vai gerar, entao o swatch mostra a cor de verdade.
function useAcentos(): typeof ACENTOS {
  const chave = useSyncExternalStore(assinarTema, snapshotTema, snapshotServidor)
  const eixo = chave.split("|")[4] ?? ""
  return useMemo(() => {
    if (!eixo) return ACENTOS
    const [h, c] = eixo.split(":")
    return [
      { id: "marca" as Acento, label: "Marca", descricao: "Cor do White-label", amostra: `oklch(76.9% ${c} ${h})` },
      ...ACENTOS,
    ]
  }, [eixo])
}

export function useTema() {
  const chave = useSyncExternalStore(assinarTema, snapshotTema, snapshotServidor)

  const tema = useMemo<Tema>(() => {
    const [modo, acento, tom] = chave.split("|")
    return { modo: modo as Modo, acento: acento as Acento, tom: tom as Tom }
  }, [chave])

  // Sincroniza o DOM com o estado atual (inclui o caso do SO mudar sozinho
  // quando o modo e "sistema"). Efeito que atualiza sistema externo, nao state.
  //
  // A primeira passada e ignorada de proposito: na hidratacao o snapshot ainda
  // e o do servidor ("escuro"), e aplicar isso sobrescreveria por um instante o
  // tema correto que o script de boot ja colocou no <html> — piscada visivel
  // para quem usa o modo claro.
  const primeiraPassada = useRef(true)
  useEffect(() => {
    if (primeiraPassada.current) {
      primeiraPassada.current = false
      return
    }
    aplicarTema(tema, true)
  }, [tema])

  function definir(parcial: Partial<Tema>) {
    // salvarTema grava, aplica e dispara "temaAlterado" — o store acima
    // reage ao evento e o componente re-renderiza.
    salvarTema(parcial)
  }

  return { tema, definir }
}

/* --------------------------------- icones --------------------------------- */

const ICONES: Record<string, React.ReactNode> = {
  claro: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </>
  ),
  escuro: <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z" />,
  sistema: (
    <>
      <rect x="2.8" y="4" width="18.4" height="12.2" rx="2" />
      <path d="M8.5 20h7M12 16.2V20" />
    </>
  ),
}

function Icone({ nome, className = "w-4 h-4" }: { nome: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {ICONES[nome]}
    </svg>
  )
}

/* ------------------------------ modo (3 vias) ------------------------------ */

export function SeletorModo({ tema, definir, className = "" }: {
  tema: Tema | null
  definir: (p: Partial<Tema>) => void
  className?: string
}) {
  return (
    <div className={`flex gap-0.5 bg-surface-2 rounded-xl p-0.5 border border-line ${className}`} role="group" aria-label="Modo de cor">
      {MODOS.map(m => {
        const ativo = tema?.modo === m.id
        return (
          <button
            key={m.id}
            type="button"
            title={m.label}
            aria-label={m.label}
            aria-pressed={ativo}
            onClick={() => definir({ modo: m.id })}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg transition-colors ${
              ativo
                ? "bg-surface-1 text-fg shadow-sm"
                : "text-fg-4 hover:text-fg-2"
            }`}
          >
            <Icone nome={m.id} className="w-3.5 h-3.5" />
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------- acentos --------------------------------- */

export function GradeAcentos({ tema, definir, colunas = 2 }: {
  tema: Tema | null
  definir: (p: Partial<Tema>) => void
  colunas?: 2 | 3 | 4
}) {
  const cols = colunas === 4 ? "grid-cols-2 sm:grid-cols-4" : colunas === 3 ? "grid-cols-3" : "grid-cols-2"
  const acentos = useAcentos()
  return (
    <div className={`grid ${cols} gap-1.5`}>
      {acentos.map(a => {
        const ativo = tema?.acento === a.id
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => definir({ acento: a.id })}
            aria-pressed={ativo}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border text-left transition-colors ${
              ativo
                ? "border-accent/50 bg-accent/10"
                : "border-line bg-surface-2 hover:border-line-strong"
            }`}
          >
            <span
              className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10"
              style={{ background: a.amostra }}
            />
            <span className="min-w-0">
              <span className={`block text-xs truncate ${ativo ? "text-fg font-semibold" : "text-fg-2 font-medium"}`}>
                {a.label}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------- tons ---------------------------------- */

export function GradeTons({ tema, definir }: {
  tema: Tema | null
  definir: (p: Partial<Tema>) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {TONS.map(t => {
        const ativo = tema?.tom === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => definir({ tom: t.id })}
            aria-pressed={ativo}
            className={`px-2 py-1.5 rounded-xl border text-center transition-colors ${
              ativo
                ? "border-accent/50 bg-accent/10 text-fg font-semibold"
                : "border-line bg-surface-2 text-fg-2 hover:border-line-strong"
            }`}
          >
            <span className="block text-xs font-medium">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------- painel completo (ajustes) ----------------------- */

export function PainelAparencia({ compacto = false }: { compacto?: boolean }) {
  const { tema, definir } = useTema()
  // A opcao "Marca" so existe se a organizacao definiu uma cor no White-label.
  const temMarca = useAcentos().some(a => a.id === "marca")

  return (
    <div className={compacto ? "space-y-3" : "space-y-4 pt-2"}>
      <div>
        <p className="text-fg-3 text-xs mb-1.5">Modo</p>
        <SeletorModo tema={tema} definir={definir} />
      </div>

      <div>
        <p className="text-fg-3 text-xs mb-1.5">Cor de acento</p>
        <GradeAcentos tema={tema} definir={definir} colunas={compacto ? 2 : 4} />
        {!compacto && (
          <p className="text-fg-4 text-xs mt-1.5">
            {temMarca && (
              <><strong className="text-fg-3 font-medium">Marca</strong> usa a cor definida no White-label. </>
            )}
            Rose, Nude e Lavanda foram pensados para saloes de beleza; Ouro e Bronze, para barbearias.
          </p>
        )}
      </div>

      <div>
        <p className="text-fg-3 text-xs mb-1.5">Tonalidade das superficies</p>
        <GradeTons tema={tema} definir={definir} />
        {!compacto && (
          <p className="text-fg-4 text-xs mt-1.5">
            Ajusta a temperatura dos fundos e dos textos — mais visivel no modo claro.
          </p>
        )}
      </div>
    </div>
  )
}

/* --------------------- controle compacto para a sidebar -------------------- */

export function ControleTema() {
  const { tema, definir } = useTema()
  const [aberto, setAberto] = useState(false)
  const caixaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function onClique(e: MouseEvent) {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false)
    }
    function onTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false)
    }
    document.addEventListener("mousedown", onClique)
    document.addEventListener("keydown", onTecla)
    return () => {
      document.removeEventListener("mousedown", onClique)
      document.removeEventListener("keydown", onTecla)
    }
  }, [aberto])

  const acentos = useAcentos()
  const acentoAtual = acentos.find(a => a.id === tema?.acento) ?? acentos[0]

  return (
    <div ref={caixaRef} className="relative flex items-center gap-1">
      <SeletorModo tema={tema} definir={definir} className="flex-1" />

      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        title={`Cor: ${acentoAtual.label}`}
        aria-label="Escolher cor e tonalidade"
        aria-expanded={aberto}
        className={`w-7 h-7 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${
          aberto ? "border-accent/50 bg-accent/10" : "border-line bg-surface-2 hover:border-line-strong"
        }`}
      >
        <span className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10" style={{ background: acentoAtual.amostra }} />
      </button>

      {aberto && (
        <div className="absolute bottom-full left-0 mb-2 w-60 bg-surface-1 border border-line rounded-2xl p-3 shadow-xl shadow-black/30 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-fg-3 text-xs uppercase tracking-widest font-mono">Aparencia</span>
            <button type="button" onClick={() => setAberto(false)} className="text-fg-4 hover:text-fg-2 text-sm leading-none">
              &#10005;
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-fg-3 text-xs mb-1.5">Cor de acento</p>
              <GradeAcentos tema={tema} definir={definir} colunas={2} />
            </div>
            <div>
              <p className="text-fg-3 text-xs mb-1.5">Tonalidade</p>
              <GradeTons tema={tema} definir={definir} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
