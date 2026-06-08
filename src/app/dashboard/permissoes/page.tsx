"use client"

import { useEffect, useState, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const ALL_RESOURCES = [
  { group: "Principal",   slug: "dashboard",    label: "Dashboard" },
  { group: "Principal",   slug: "agenda",       label: "Agenda" },
  { group: "Principal",   slug: "fila",         label: "Fila de Espera" },
  { group: "Principal",   slug: "painel_tv",    label: "Painel TV" },
  { group: "Gestão",      slug: "clientes",     label: "Clientes" },
  { group: "Gestão",      slug: "servicos",     label: "Serviços" },
  { group: "Gestão",      slug: "galeria",      label: "Galeria de Cortes" },
  { group: "Gestão",      slug: "equipe",       label: "Equipe" },
  { group: "Gestão",      slug: "estoque",      label: "Estoque" },
  { group: "Gestão",      slug: "ia_estoque",   label: "IA Estoque" },
  { group: "Gestão",      slug: "domicilio",    label: "Domicílio" },
  { group: "Gestão",      slug: "ia_biotipo",   label: "IA Biotipo" },
  { group: "Financeiro",  slug: "pix",          label: "PIX & Cobranças" },
  { group: "Financeiro",  slug: "caixa",        label: "Caixa" },
  { group: "Financeiro",  slug: "financeiro",   label: "Financeiro" },
  { group: "Financeiro",  slug: "fiscal",       label: "Fiscal & NF-e" },
  { group: "Financeiro",  slug: "precificacao", label: "Precificação" },
  { group: "Fidelidade",  slug: "cashback",     label: "Cashback" },
  { group: "Fidelidade",  slug: "assinaturas",  label: "Assinaturas" },
  { group: "Fidelidade",  slug: "clientes_ia",  label: "Central IA" },
  { group: "Comunicação", slug: "whatsapp",     label: "WhatsApp" },
  { group: "Escala",      slug: "unidades",     label: "Multi-unidades" },
  { group: "Escala",      slug: "white_label",  label: "White-label" },
  { group: "Escala",      slug: "media",        label: "BarberOS Media" },
  { group: "Sistema",     slug: "configuracoes",label: "Configurações" },
  { group: "Sistema",     slug: "api_docs",     label: "API Docs" },
]

// Roles ORG_OWNER can configure (not ADMIN or ORG_OWNER themselves)
const ROLES = [
  { slug: "ORG_MANAGER",  label: "Gerente de Org." },
  { slug: "UNIT_MANAGER", label: "Gerente de Unidade" },
  { slug: "RECEPTIONIST", label: "Recepcionista" },
  { slug: "PROFESSIONAL", label: "Profissional" },
]

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

export default function PermissoesPadraoPage() {
  const [matrix, setMatrix] = useState<Matrix>(emptyMatrix())
  const [activeRole, setActiveRole] = useState("ORG_MANAGER")
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [hasOrgOverrides, setHasOrgOverrides] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/permissoes-padrao")
      const data = await res.json()
      const m = emptyMatrix()
      for (const t of data.templates ?? []) {
        if (m[t.role]?.[t.resource] !== undefined) {
          m[t.role][t.resource] = { canView: t.canView, canCreate: t.canCreate, canEdit: t.canEdit, canDelete: t.canDelete }
        }
      }
      setMatrix(m)
      setHasOrgOverrides(data.hasOrgOverrides ?? false)
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
      if (field === "canView" && !next[role][resource].canView) {
        next[role][resource] = { canView: false, canCreate: false, canEdit: false, canDelete: false }
      }
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
      const res = await fetch("/api/permissoes-padrao", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setMsg({ type: "ok", text: "Permissões salvas. Novos colaboradores herdarão essas regras." })
        setHasOrgOverrides(true)
      } else {
        setMsg({ type: "err", text: "Erro ao salvar." })
      }
    } catch {
      setMsg({ type: "err", text: "Erro de rede." })
    } finally {
      setSalvando(false)
    }
  }

  const grupos = Array.from(new Set(ALL_RESOURCES.map(r => r.group)))

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold">Permissões por Função</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Configure o que cada função pode ver e fazer em sua organização.
              {hasOrgOverrides
                ? " Configuração personalizada — sobrescreve o padrão da plataforma."
                : " Usando padrão da plataforma — salve para criar sua própria configuração."}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={salvar}
              disabled={salvando}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${msg.type === "ok" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
            {msg.text}
          </div>
        )}

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 text-amber-400/80 text-sm">
          Estas são as permissões <strong>padrão para novas contas</strong>. Para alterar permissões de um colaborador específico, acesse <strong>Equipe → colaborador → Permissões</strong>.
        </div>

        {/* Role tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {ROLES.map(r => (
            <button
              key={r.slug}
              onClick={() => setActiveRole(r.slug)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeRole === r.slug ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
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
      </div>
    </DashboardLayout>
  )
}
