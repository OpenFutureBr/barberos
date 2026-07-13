"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { RESOURCES as ALL_RESOURCES } from "@/lib/resources"

// Roles ORG_OWNER can configure (not ADMIN or ORG_OWNER themselves)
const ROLES = [
  { slug: "ORG_MANAGER",  label: "Gerente de Org.",     desc: "Administra a rede inteira — todas as unidades, financeiro e equipe." },
  { slug: "UNIT_MANAGER", label: "Gerente de Unidade",  desc: "Roda o dia a dia de uma unidade: agenda, caixa, estoque e equipe local." },
  { slug: "RECEPTIONIST", label: "Recepcionista",       desc: "Atende o balcão: marca horários, cadastra clientes, lança pagamentos no caixa." },
  { slug: "PROFESSIONAL", label: "Profissional",        desc: "Barbeiro CLT, MEI ou autônomo — o vínculo só muda o repasse, o acesso é o mesmo." },
]

type Perm = { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }
type Matrix = Record<string, Record<string, Perm>>

const NONE: Perm = { canView: false, canCreate: false, canEdit: false, canDelete: false }
const V: Perm    = { canView: true,  canCreate: false, canEdit: false, canDelete: false }
const VC: Perm   = { canView: true,  canCreate: true,  canEdit: false, canDelete: false }
const VCE: Perm  = { canView: true,  canCreate: true,  canEdit: true,  canDelete: false }
const VCED: Perm = { canView: true,  canCreate: true,  canEdit: true,  canDelete: true }

// Sugestão de calibração — ponto de partida razoável, não é aplicado
// automaticamente. O usuário clica em "Usar sugestão" e ainda precisa Salvar.
const SUGESTAO_RECOMENDADA: Record<string, Record<string, Perm>> = {
  ORG_MANAGER: {
    dashboard: VCED, agenda: VCED, fila: VCED, painel_tv: V,
    clientes: VCED, servicos: VCED, equipe: VCED, estoque: VCED, bancada: VCED, ia_estoque: V, domicilio: VCED, ia_biotipo: V,
    pix: VCE, caixa: VCE, financeiro: V, fiscal: V, precificacao: VCED,
    cashback: V, assinaturas: V, clientes_ia: V,
    whatsapp: V,
    unidades: VCE, white_label: V, media: V,
    configuracoes: V, permissoes: NONE, ajuda: V, api_docs: NONE,
  },
  UNIT_MANAGER: {
    dashboard: VCED, agenda: VCED, fila: VCED, painel_tv: V,
    clientes: VCED, servicos: VCED, equipe: V, estoque: VCED, bancada: VCED, ia_estoque: V, domicilio: VCED, ia_biotipo: V,
    pix: VCE, caixa: VCE, financeiro: V, fiscal: NONE, precificacao: NONE,
    cashback: V, assinaturas: V, clientes_ia: V,
    whatsapp: VCE,
    unidades: NONE, white_label: NONE, media: NONE,
    configuracoes: V, permissoes: NONE, ajuda: V, api_docs: NONE,
  },
  RECEPTIONIST: {
    dashboard: V, agenda: VCE, fila: VCE, painel_tv: V,
    clientes: VCE, servicos: V, equipe: NONE, estoque: NONE, bancada: NONE, ia_estoque: NONE, domicilio: NONE, ia_biotipo: NONE,
    pix: V, caixa: VC, financeiro: NONE, fiscal: NONE, precificacao: NONE,
    cashback: V, assinaturas: NONE, clientes_ia: NONE,
    whatsapp: VCE,
    unidades: NONE, white_label: NONE, media: NONE,
    configuracoes: NONE, permissoes: NONE, ajuda: V, api_docs: NONE,
  },
  PROFESSIONAL: {
    dashboard: V, agenda: V, fila: V, painel_tv: NONE,
    clientes: NONE, servicos: V, equipe: NONE, estoque: NONE, bancada: NONE, ia_estoque: NONE, domicilio: V, ia_biotipo: V,
    pix: NONE, caixa: NONE, financeiro: NONE, fiscal: NONE, precificacao: NONE,
    cashback: V, assinaturas: NONE, clientes_ia: NONE,
    whatsapp: NONE,
    unidades: NONE, white_label: NONE, media: NONE,
    configuracoes: NONE, permissoes: NONE, ajuda: V, api_docs: NONE,
  },
}

function emptyMatrix(): Matrix {
  const m: Matrix = {}
  for (const r of ROLES) {
    m[r.slug] = {}
    for (const res of ALL_RESOURCES) {
      m[r.slug][res.slug] = { ...NONE }
    }
  }
  return m
}

function matrizIguais(a: Matrix, b: Matrix): boolean {
  for (const r of ROLES) {
    for (const res of ALL_RESOURCES) {
      const pa = a[r.slug]?.[res.slug]
      const pb = b[r.slug]?.[res.slug]
      if (!pa || !pb) continue
      if (pa.canView !== pb.canView || pa.canCreate !== pb.canCreate || pa.canEdit !== pb.canEdit || pa.canDelete !== pb.canDelete) return false
    }
  }
  return true
}

export default function PermissoesPadraoPage() {
  const [matrix, setMatrix] = useState<Matrix>(emptyMatrix())
  const [matrixSalva, setMatrixSalva] = useState<Matrix>(emptyMatrix())
  const [userCounts, setUserCounts] = useState<Record<string, number>>({})
  const [activeRole, setActiveRole] = useState("ORG_MANAGER")
  const [busca, setBusca] = useState("")
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
      setMatrixSalva(m)
      setUserCounts(data.userCounts ?? {})
      setHasOrgOverrides(data.hasOrgOverrides ?? false)
    } catch {
      // keep empty matrix
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const temAlteracoes = useMemo(() => !matrizIguais(matrix, matrixSalva), [matrix, matrixSalva])

  function toggle(role: string, resource: string, field: keyof Perm) {
    setMsg(null)
    setMatrix(prev => {
      const next = { ...prev, [role]: { ...prev[role], [resource]: { ...prev[role][resource], [field]: !prev[role][resource][field] } } }
      if (field === "canView" && !next[role][resource].canView) {
        next[role][resource] = { ...NONE }
      }
      if (field !== "canView" && next[role][resource][field]) {
        next[role][resource].canView = true
      }
      return next
    })
  }

  function toggleAll(resource: string, on: boolean) {
    setMsg(null)
    setMatrix(prev => ({
      ...prev,
      [activeRole]: { ...prev[activeRole], [resource]: on ? { ...VCED } : { ...NONE } },
    }))
  }

  function toggleGrupo(grupo: string, on: boolean) {
    setMsg(null)
    const resourcesDoGrupo = ALL_RESOURCES.filter(r => r.group === grupo).map(r => r.slug)
    setMatrix(prev => {
      const roleAtual = { ...prev[activeRole] }
      for (const slug of resourcesDoGrupo) roleAtual[slug] = on ? { ...VCED } : { ...NONE }
      return { ...prev, [activeRole]: roleAtual }
    })
  }

  function usarSugestao() {
    const sugestao = SUGESTAO_RECOMENDADA[activeRole]
    if (!sugestao) return
    setMsg(null)
    setMatrix(prev => {
      const roleAtual = { ...prev[activeRole] }
      for (const res of ALL_RESOURCES) {
        roleAtual[res.slug] = { ...(sugestao[res.slug] ?? NONE) }
      }
      return { ...prev, [activeRole]: roleAtual }
    })
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
        setMatrixSalva(matrix)
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
  const buscaLower = busca.trim().toLowerCase()
  const resourcesFiltrados = buscaLower
    ? ALL_RESOURCES.filter(r => r.label.toLowerCase().includes(buscaLower))
    : ALL_RESOURCES

  const roleInfo = ROLES.find(r => r.slug === activeRole)

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-2xl font-bold">Permissões por Função</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Configure o que cada função pode ver e fazer em sua organização.
              {hasOrgOverrides
                ? " Configuração personalizada — sobrescreve o padrão da plataforma."
                : " Usando padrão da plataforma — salve para criar sua própria configuração."}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {temAlteracoes && (
              <span className="text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25">
                Alterações não salvas
              </span>
            )}
            <button
              onClick={salvar}
              disabled={salvando || !temAlteracoes}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors disabled:opacity-40"
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
        <div className="flex gap-2 mb-3 flex-wrap">
          {ROLES.map(r => (
            <button
              key={r.slug}
              onClick={() => setActiveRole(r.slug)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeRole === r.slug ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
            >
              {r.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeRole === r.slug ? "bg-black/15" : "bg-zinc-700"}`}>
                {userCounts[r.slug] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {roleInfo && (
          <div className="flex items-center justify-between gap-3 mb-4 px-1 flex-wrap">
            <p className="text-zinc-500 text-xs">{roleInfo.desc}</p>
            <button
              onClick={usarSugestao}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors flex-shrink-0"
              title="Preenche a matriz com uma sugestão de calibração — ainda precisa salvar"
            >
              ✦ Usar sugestão recomendada
            </button>
          </div>
        )}

        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Filtrar recursos..."
          className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600 mb-4"
        />

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_60px_60px_60px_60px_50px] gap-0 px-5 py-3 border-b border-zinc-800">
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Recurso</div>
            <div className="text-zinc-500 text-xs text-center" title="Ver">Ver</div>
            <div className="text-zinc-500 text-xs text-center" title="Criar">Criar</div>
            <div className="text-zinc-500 text-xs text-center" title="Editar">Editar</div>
            <div className="text-zinc-500 text-xs text-center" title="Excluir">Excluir</div>
            <div className="text-zinc-500 text-xs text-center" title="Marca tudo de uma vez">Tudo</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
          ) : resourcesFiltrados.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-sm">Nenhum recurso encontrado para "{busca}"</div>
          ) : (
            grupos.map(grupo => {
              const resourcesDoGrupo = resourcesFiltrados.filter(r => r.group === grupo)
              if (resourcesDoGrupo.length === 0) return null
              const todosResourcesDoGrupo = ALL_RESOURCES.filter(r => r.group === grupo).map(r => r.slug)
              const grupoTodoOn = todosResourcesDoGrupo.every(slug => {
                const p = matrix[activeRole]?.[slug]
                return p?.canView && p?.canCreate && p?.canEdit && p?.canDelete
              })
              return (
                <div key={grupo}>
                  <div className="grid grid-cols-[1fr_60px_60px_60px_60px_50px] gap-0 px-5 py-2 bg-zinc-800/50 items-center">
                    <div className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">{grupo}</div>
                    <div className="col-span-4" />
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleGrupo(grupo, !grupoTodoOn)}
                        title={`Marcar/desmarcar tudo em ${grupo}`}
                        className={`w-5 h-5 rounded border-2 transition-colors ${grupoTodoOn ? "bg-blue-500 border-blue-500" : "border-zinc-600 hover:border-zinc-400"}`}
                      >
                        {grupoTodoOn && <span className="text-white text-xs font-bold">✓</span>}
                      </button>
                    </div>
                  </div>
                  {resourcesDoGrupo.map(res => {
                    const perm = matrix[activeRole]?.[res.slug] ?? { ...NONE }
                    const allOn = perm.canView && perm.canCreate && perm.canEdit && perm.canDelete
                    return (
                      <div key={res.slug} className="grid grid-cols-[1fr_60px_60px_60px_60px_50px] gap-0 px-5 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
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
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
