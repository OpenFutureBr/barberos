"use client"

import { useEffect, useState, useCallback } from "react"
import AdminLayout from "@/components/admin/AdminLayout"
import { RESOURCES as ALL_RESOURCES } from "@/lib/resources"

const ROLES = [
  { slug: "ORG_MANAGER",   label: "Gerente",          desc: "Gestão completa exceto configurações sensíveis" },
  { slug: "UNIT_MANAGER",  label: "Gerente de Unidade", desc: "Gestão operacional de uma unidade" },
  { slug: "RECEPTIONIST",  label: "Recepcionista",    desc: "Agenda, caixa e atendimento ao cliente" },
  { slug: "PROFESSIONAL",  label: "Profissional",     desc: "Acesso à própria agenda" },
]

const DEFAULTS: Record<string, Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>> = {
  ORG_MANAGER: {
    dashboard: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    agenda: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    fila: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    painel_tv: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    clientes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    servicos: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    equipe: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    estoque: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    ia_estoque: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    domicilio: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    ia_biotipo: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    pix: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    caixa: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    financeiro: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    fiscal: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    precificacao: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    cashback: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    assinaturas: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    clientes_ia: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    whatsapp: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    unidades: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    white_label: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    media: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    api_docs: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  UNIT_MANAGER: {
    dashboard: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    agenda: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    fila: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    painel_tv: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    clientes: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    servicos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    equipe: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    estoque: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    ia_estoque: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    domicilio: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    ia_biotipo: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    pix: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    caixa: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    financeiro: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    fiscal: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    precificacao: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    cashback: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    assinaturas: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    clientes_ia: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    whatsapp: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    unidades: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    white_label: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    media: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    api_docs: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  RECEPTIONIST: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    agenda: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    fila: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    painel_tv: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    clientes: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    servicos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    equipe: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    estoque: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ia_estoque: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    domicilio: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ia_biotipo: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    pix: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    caixa: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    financeiro: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    fiscal: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    precificacao: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    cashback: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    assinaturas: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    clientes_ia: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    whatsapp: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    unidades: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    white_label: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    media: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    api_docs: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  PROFESSIONAL: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    agenda: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    fila: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    painel_tv: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    clientes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    servicos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    equipe: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    estoque: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ia_estoque: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    domicilio: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    ia_biotipo: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    pix: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    caixa: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    financeiro: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    fiscal: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    precificacao: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    cashback: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    assinaturas: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    clientes_ia: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    whatsapp: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    unidades: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    white_label: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    media: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    api_docs: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
}

type Perm = { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }
type Matrix = Record<string, Record<string, Perm>>

function emptyMatrix(): Matrix {
  const m: Matrix = {}
  for (const r of ROLES) {
    m[r.slug] = {}
    for (const res of ALL_RESOURCES) {
      m[r.slug][res.slug] = { canView: false, canCreate: false, canEdit: false, canDelete: false }
    }
  }
  return m
}

export default function AdminPermissoesPage() {
  const [matrix, setMatrix] = useState<Matrix>(emptyMatrix())
  const [activeRole, setActiveRole] = useState("ORG_MANAGER")
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/permissoes")
      const data = await res.json()
      const m = emptyMatrix()
      for (const t of data) {
        if (m[t.role]?.[t.resource] !== undefined) {
          m[t.role][t.resource] = { canView: t.canView, canCreate: t.canCreate, canEdit: t.canEdit, canDelete: t.canDelete }
        }
      }
      setMatrix(m)
    } catch {
      // keep empty matrix
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(role: string, resource: string, field: keyof Perm) {
    setMatrix(prev => {
      const next = { ...prev, [role]: { ...prev[role], [resource]: { ...prev[role][resource], [field]: !prev[role][resource][field] } } }
      // if canView turned off, disable the others too
      if (field === "canView" && !next[role][resource].canView) {
        next[role][resource] = { canView: false, canCreate: false, canEdit: false, canDelete: false }
      }
      // if create/edit/delete turned on, enable canView
      if (field !== "canView" && next[role][resource][field]) {
        next[role][resource].canView = true
      }
      return next
    })
  }

  function toggleAll(resource: string, on: boolean) {
    setMatrix(prev => ({
      ...prev,
      [activeRole]: { ...prev[activeRole], [resource]: { canView: on, canCreate: on, canEdit: on, canDelete: on } },
    }))
  }

  async function salvar() {
    setSalvando(true)
    setMsg(null)
    try {
      const payload = ROLES.flatMap(r =>
        ALL_RESOURCES.map(res => ({
          role: r.slug,
          resource: res.slug,
          ...matrix[r.slug][res.slug],
        }))
      )
      const res = await fetch("/api/admin/permissoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) setMsg({ type: "ok", text: "Permissões salvas com sucesso." })
      else setMsg({ type: "err", text: "Erro ao salvar." })
    } catch {
      setMsg({ type: "err", text: "Erro de rede." })
    } finally {
      setSalvando(false)
    }
  }

  function restaurarPadroes() {
    const m = emptyMatrix()
    for (const r of ROLES) {
      for (const res of ALL_RESOURCES) {
        m[r.slug][res.slug] = DEFAULTS[r.slug]?.[res.slug] ?? { canView: false, canCreate: false, canEdit: false, canDelete: false }
      }
    }
    setMatrix(m)
    setMsg({ type: "ok", text: "Padrões carregados — clique em Salvar para confirmar." })
  }

  const grupos = Array.from(new Set(ALL_RESOURCES.map(r => r.group)))

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Permissões por Função</h1>
            <p className="text-zinc-500 text-sm mt-1">Padrão da plataforma — aplicado a novas implantações quando não há configuração de organização.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={restaurarPadroes}
              className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-500 hover:text-white transition-colors"
            >
              Restaurar padrões
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${msg.type === "ok" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {/* Role tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          {ROLES.map(r => (
            <button
              key={r.slug}
              onClick={() => setActiveRole(r.slug)}
              className={`text-left px-4 py-3 rounded-xl border transition-all ${activeRole === r.slug ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"}`}
            >
              <div className="font-semibold text-sm">{r.label}</div>
              <div className="text-xs opacity-60 mt-0.5 leading-snug">{(r as any).desc}</div>
            </button>
          ))}
        </div>

        <div className="mb-3 px-4 py-2 bg-zinc-800/30 border border-zinc-800 rounded-xl">
          <p className="text-zinc-500 text-xs">
            <span className="text-white font-medium">Administrador (ORG_OWNER)</span> sempre tem acesso total.
            Estas permissões são o padrão — podem ser sobrescritas individualmente na página de Equipe.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-0 px-5 py-3 border-b border-zinc-800">
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Recurso</div>
            <div className="text-zinc-500 text-xs text-center">Ver</div>
            <div className="text-zinc-500 text-xs text-center">Criar</div>
            <div className="text-zinc-500 text-xs text-center">Editar</div>
            <div className="text-zinc-500 text-xs text-center">Excluir</div>
            <div className="text-zinc-500 text-xs text-center">Todos</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
          ) : (
            grupos.map(grupo => (
              <div key={grupo}>
                <div className="px-5 py-2 bg-zinc-800/50 text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                  {grupo}
                </div>
                {ALL_RESOURCES.filter(r => r.group === grupo).map(res => {
                  const perm = matrix[activeRole]?.[res.slug] ?? { canView: false, canCreate: false, canEdit: false, canDelete: false }
                  const allOn = perm.canView && perm.canCreate && perm.canEdit && perm.canDelete
                  return (
                    <div key={res.slug} className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-0 px-5 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <div className="text-white text-sm">{res.label}</div>
                      {(["canView", "canCreate", "canEdit", "canDelete"] as const).map(field => (
                        <div key={field} className="flex items-center justify-center">
                          <button
                            onClick={() => toggle(activeRole, res.slug, field)}
                            className={`w-5 h-5 rounded border-2 transition-colors ${perm[field] ? "bg-amber-500 border-amber-500" : "border-zinc-600 hover:border-zinc-400"}`}
                          >
                            {perm[field] && <span className="text-black text-xs font-bold">✓</span>}
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => toggleAll(res.slug, !allOn)}
                          className={`w-5 h-5 rounded border-2 transition-colors ${allOn ? "bg-blue-500 border-blue-500" : "border-zinc-600 hover:border-zinc-400"}`}
                        >
                          {allOn && <span className="text-white text-xs font-bold">✓</span>}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <p className="text-zinc-600 text-xs mt-4">
          ADMIN e ORG_OWNER sempre têm acesso total e não aparecem aqui.
          As permissões aqui são o padrão quando nenhuma organização define seu próprio padrão.
        </p>
      </div>
    </AdminLayout>
  )
}
