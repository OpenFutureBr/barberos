"use client"

import { useState, useEffect, useRef } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { RESOURCES } from "@/lib/resources"
import { roleLabel, roleBadge } from "@/lib/role-labels"
import { fetchJsonSafe } from "@/lib/safe-fetch"

// ── Modal de Permissões ────────────────────────────────────────────────────

type Perm = { resource: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }

function PermissoesModal({ prof, onFechar }: { prof: any; onFechar: () => void }) {
  const [perms, setPerms] = useState<Record<string, Perm>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [gerandoAcesso, setGerandoAcesso] = useState(false)
  const [usernameGerado, setUsernameGerado] = useState<string | null>(prof.username ?? null)

  useEffect(() => {
    fetch(`/api/equipe/${prof.id}/permissoes`)
      .then(r => r.json())
      .then((data: Perm[]) => {
        const map: Record<string, Perm> = {}
        RESOURCES.forEach(r => {
          const existing = data.find(p => p.resource === r.slug)
          map[r.slug] = existing ?? { resource: r.slug, canView: false, canCreate: false, canEdit: false, canDelete: false }
        })
        setPerms(map)
      })
      .finally(() => setLoading(false))
  }, [prof.id])

  function toggle(slug: string, field: keyof Omit<Perm, "resource">) {
    setPerms(prev => ({ ...prev, [slug]: { ...prev[slug], [field]: !prev[slug][field] } }))
  }

  function toggleTudo(slug: string, ativo: boolean) {
    setPerms(prev => ({ ...prev, [slug]: { resource: slug, canView: ativo, canCreate: ativo, canEdit: ativo, canDelete: ativo } }))
  }

  async function salvar() {
    setSalvando(true)
    await fetch(`/api/equipe/${prof.id}/permissoes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.values(perms)),
    })
    setSalvando(false)
    onFechar()
  }

  const grupos = Array.from(new Set(RESOURCES.map(r => r.group)))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-white font-bold text-sm">Permissões de acesso</h2>
              {prof.role && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${roleBadge(prof.role)}`}>
                  {roleLabel(prof.role)}
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-xs">
              {prof.name} · {usernameGerado ? <span className="text-amber-400 font-mono">@{usernameGerado}</span> : <span className="text-red-400">sem usuário</span>}
            </p>
          </div>
          <button onClick={onFechar} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        {!usernameGerado && (
          <div className="mx-5 mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-amber-400 text-sm font-medium">Sem acesso ao sistema</div>
              <div className="text-zinc-500 text-xs mt-0.5">Gere um login para que este profissional possa entrar no sistema. A senha inicial será <span className="font-mono text-zinc-400">123456</span>.</div>
            </div>
            <button
              onClick={async () => {
                setGerandoAcesso(true)
                const res = await fetch(`/api/equipe/${prof.id}/gerar-acesso`, { method: "POST" })
                const data = await res.json()
                if (res.ok) setUsernameGerado(data.username)
                setGerandoAcesso(false)
              }}
              disabled={gerandoAcesso}
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors">
              {gerandoAcesso ? "Gerando..." : "Gerar acesso"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Carregando...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {grupos.map(grupo => (
              <div key={grupo}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest">{grupo}</div>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <div className="space-y-1">
                  {RESOURCES.filter(r => r.group === grupo).map(r => {
                    const p = perms[r.slug]
                    const tudoAtivo = p?.canView && p?.canCreate && p?.canEdit && p?.canDelete
                    const nada = !p?.canView && !p?.canCreate && !p?.canEdit && !p?.canDelete
                    return (
                      <div key={r.slug} className="bg-zinc-800/50 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-white text-sm">{r.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {(["canView", "canCreate", "canEdit", "canDelete"] as const).map(f => {
                            const LABEL = { canView: "Ver", canCreate: "Criar", canEdit: "Editar", canDelete: "Excluir" }
                            const ativo = p?.[f] ?? false
                            return (
                              <button key={f} type="button" onClick={() => toggle(r.slug, f)}
                                title={LABEL[f]}
                                className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${ativo ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-700/40 text-zinc-600 border-zinc-700 hover:border-zinc-500 hover:text-zinc-400"}`}>
                                {LABEL[f]}
                              </button>
                            )
                          })}
                        </div>
                        <button type="button" onClick={() => toggleTudo(r.slug, nada)}
                          title={tudoAtivo ? "Remover tudo" : "Liberar tudo"}
                          className={`w-8 h-5 rounded-full border-2 relative flex-shrink-0 transition-all ${tudoAtivo ? "bg-amber-500 border-amber-500" : "bg-zinc-700 border-zinc-600"}`}>
                          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tudoAtivo ? "left-4" : "left-0.5"}`} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-5 border-t border-zinc-800 flex gap-3">
          <button onClick={onFechar}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || loading}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
            {salvando ? "Salvando..." : "Salvar permissões"}
          </button>
        </div>
      </div>
    </div>
  )
}

const vinculoStyle: Record<string, string> = {
  CLT: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  MEI: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  PJ: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  SOLO: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  PARTNER: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
}

const vinculoLabel: Record<string, string> = {
  CLT: "CLT", MEI: "MEI", PJ: "PJ", SOLO: "Autônomo 🚗", PARTNER: "Parceiro",
}

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const horasOpcoes = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`)

function hojeISO() {
  return new Date().toISOString().split("T")[0]
}

function formatarTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 11)
  if (nums.length <= 2) return nums.length ? `(${nums}` : ""
  if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`
  return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`
}

function calcularIdade(birthDate: string | null) {
  if (!birthDate) return null
  const hoje = new Date()
  const nasc = new Date(birthDate)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

function calcularTempoCasa(admissionDate: string | null): string | null {
  if (!admissionDate) return null
  const hoje = new Date()
  const admissao = new Date(admissionDate)
  const anos = hoje.getFullYear() - admissao.getFullYear()
  const meses = hoje.getMonth() - admissao.getMonth() + anos * 12
  if (meses < 1) return "Menos de 1 mês"
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`
  const a = Math.floor(meses / 12)
  const m = meses % 12
  if (m === 0) return `${a} ${a === 1 ? "ano" : "anos"}`
  return `${a} ${a === 1 ? "ano" : "anos"} e ${m} ${m === 1 ? "mês" : "meses"}`
}

function FormularioProfissional({
  inicial, onSalvar, onCancelar, salvando, erro, titulo, servicos,
}: {
  inicial?: any
  onSalvar: (dados: any) => void
  onCancelar: () => void
  salvando: boolean
  erro: string
  titulo: string
  servicos: any[]
}) {
  const [nome, setNome] = useState(inicial?.name || "")
  const [email, setEmail] = useState(inicial?.email || "")
  const [telefone, setTelefone] = useState(inicial?.phone || "")
  const [vinculo, setVinculo] = useState(inicial?.employmentType || "CLT")
  const [comissao, setComissao] = useState(inicial?.commissionPct?.toString() || "")
  const [bancada, setBancada] = useState(inicial?.benchFee?.toString() || "")
  const [nascimento, setNascimento] = useState(inicial?.birthDate ? inicial.birthDate.split("T")[0] : "")
  const [admissao, setAdmissao] = useState(inicial?.admissionDate ? inicial.admissionDate.split("T")[0] : hojeISO())
  const [pixKey, setPixKey] = useState(inicial?.pixKey || "")
  const [attendsHome, setAttendsHome] = useState(inicial?.attendsHome || false)
  const [breakMin, setBreakMin] = useState(inicial?.breakBetweenAppts?.toString() || "10")
  const [isActive, setIsActive] = useState(inicial?.isActive ?? true)
  const [cep, setCep] = useState(inicial?.homeZipCode || "")
  const [rua, setRua] = useState(inicial?.homeAddress || "")
  const [numero, setNumero] = useState(inicial?.homeNumber || "")
  const [bairro, setBairro] = useState(inicial?.homeNeighborhood || "")
  const [cidade, setCidade] = useState(inicial?.homeCity || "")
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [serviceIds, setServiceIds] = useState<string[]>(
    inicial?.userServices?.map((us: any) => us.serviceId) || []
  )
  const [schedules, setSchedules] = useState<any[]>(
    inicial?.schedules?.length
      ? inicial.schedules
      : diasSemana.map((_, i) => ({ dayOfWeek: i, startTime: "08:00", endTime: "18:00", isActive: i >= 1 && i <= 6 }))
  )

  async function buscarCep(valor: string) {
    const nums = valor.replace(/\D/g, "")
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
      const data = await res.json()
      if (!data.erro) { setRua(data.logradouro || ""); setBairro(data.bairro || ""); setCidade(data.localidade || "") }
    } catch {} finally { setBuscandoCep(false) }
  }

  function handleCep(valor: string) {
    const nums = valor.replace(/\D/g, "").slice(0, 8)
    const fmt = nums.length > 5 ? `${nums.slice(0,5)}-${nums.slice(5)}` : nums
    setCep(fmt)
    if (nums.length === 8) buscarCep(nums)
  }

  function toggleServico(id: string) {
    setServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function toggleDia(idx: number) {
    setSchedules(prev => prev.map(s => s.dayOfWeek === idx ? { ...s, isActive: !s.isActive } : s))
  }

  function updateHorario(idx: number, campo: "startTime" | "endTime", valor: string) {
    setSchedules(prev => prev.map(s => s.dayOfWeek === idx ? { ...s, [campo]: valor } : s))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSalvar({
      name: nome, email, phone: telefone || null,
      employmentType: vinculo,
      commissionPct: comissao ? parseFloat(comissao) : null,
      benchFee: bancada ? parseFloat(bancada) : null,
      birthDate: nascimento || null,
      admissionDate: admissao || null,
      pixKey: pixKey || null,
      attendsHome,
      breakBetweenAppts: parseInt(breakMin) || 10,
      isActive,
      homeZipCode: cep.replace(/\D/g, "") || null,
      homeAddress: rua || null,
      homeNumber: numero || null,
      homeNeighborhood: bairro || null,
      homeCity: cidade || null,
      serviceIds,
      schedules,
      role: vinculo === "SOLO" ? "AUTONOMO" : "BARBER_CLT",
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-white font-bold">{titulo}</h2>
          <button onClick={onCancelar} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Nome completo *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase()))}
              required placeholder="Ex: Lucas Carvalho"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Email *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Telefone</label>
              <input value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Data de nascimento</label>
              <input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Data de admissão *</label>
              <input type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Chave PIX</label>
            <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, email ou telefone"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Tipo de vínculo *</label>
            <div className="grid grid-cols-3 gap-2">
              {["CLT", "MEI", "PJ", "PARTNER", "SOLO"].map((v) => (
                <button key={v} type="button" onClick={() => setVinculo(v)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                    vinculo === v ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                  }`}>
                  {vinculoLabel[v]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Comissão (%)</label>
              <input value={comissao} onChange={(e) => setComissao(e.target.value)}
                type="number" min="0" max="100" placeholder="Ex: 40"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Intervalo entre cortes (min)</label>
              <input value={breakMin} onChange={(e) => setBreakMin(e.target.value)}
                type="number" min="0" max="60" placeholder="10"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
            </div>
          </div>

          {vinculo === "MEI" && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
              <label className="text-purple-400 text-xs mb-1 block">Taxa de bancada (R$/mês)</label>
              <input value={bancada} onChange={(e) => setBancada(e.target.value)} type="number" placeholder="Ex: 800"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600" />
            </div>
          )}

          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAttendsHome(!attendsHome)}
                className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${attendsHome ? "bg-teal-500" : "bg-zinc-700"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${attendsHome ? "left-5" : "left-1"}`} />
              </button>
              <span className="text-zinc-400 text-sm cursor-pointer" onClick={() => setAttendsHome(!attendsHome)}>Atende a domicílio</span>
            </div>
            {inicial && (
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setIsActive(!isActive)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${isActive ? "bg-green-500" : "bg-zinc-700"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isActive ? "left-5" : "left-1"}`} />
                </button>
                <span className="text-zinc-400 text-sm cursor-pointer" onClick={() => setIsActive(!isActive)}>
                  {isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
            )}
          </div>

          <div>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest border-t border-zinc-800 pt-3 mb-3">Horários de atendimento</p>
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.dayOfWeek} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${s.isActive ? "bg-zinc-800" : "bg-zinc-900 opacity-50"}`}>
                  <button type="button" onClick={() => toggleDia(s.dayOfWeek)}
                    className={`w-8 h-5 rounded-full transition-colors relative flex-shrink-0 ${s.isActive ? "bg-amber-500" : "bg-zinc-700"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${s.isActive ? "left-3.5" : "left-0.5"}`} />
                  </button>
                  <span className="text-zinc-400 text-xs w-8 flex-shrink-0">{diasSemana[s.dayOfWeek]}</span>
                  <select value={s.startTime} onChange={(e) => updateHorario(s.dayOfWeek, "startTime", e.target.value)}
                    disabled={!s.isActive}
                    className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-1 text-xs outline-none focus:border-amber-500 disabled:opacity-40">
                    {horasOpcoes.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-zinc-600 text-xs">até</span>
                  <select value={s.endTime} onChange={(e) => updateHorario(s.dayOfWeek, "endTime", e.target.value)}
                    disabled={!s.isActive}
                    className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-1 text-xs outline-none focus:border-amber-500 disabled:opacity-40">
                    {horasOpcoes.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {servicos.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest border-t border-zinc-800 pt-3 mb-3">Serviços que presta</p>
              <div className="grid grid-cols-2 gap-2">
                {servicos.map((s) => (
                  <button key={s.id} type="button" onClick={() => toggleServico(s.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      serviceIds.includes(s.id) ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${serviceIds.includes(s.id) ? "bg-amber-500 border-amber-500" : "border-zinc-600"}`}>
                      {serviceIds.includes(s.id) && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                    <div>
                      <div className="text-xs font-medium leading-tight">{s.name}</div>
                      <div className="text-xs opacity-60">{s.durationMin}min</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest border-t border-zinc-800 pt-3 mb-3">Endereço</p>
            <div className="space-y-2">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  CEP {buscandoCep && <span className="text-zinc-500 normal-case">— buscando...</span>}
                </label>
                <input value={cep} onChange={(e) => handleCep(e.target.value)} placeholder="00000-000"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-zinc-400 text-xs mb-1 block">Rua</label>
                  <input value={rua} onChange={(e) => setRua(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Número</label>
                  <input value={numero} onChange={(e) => setNumero(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Bairro</label>
                  <input value={bairro} onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Cidade</label>
                  <input value={cidade} onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{erro}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancelar}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
              {salvando ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EquipePage() {
  const cacheEquipe = useRef<any[] | null>(null)
  const [equipe, setEquipe] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "inativos">("ativos")
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [profSelecionado, setProfSelecionado] = useState<any | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroModal, setErroModal] = useState("")
  const [modalPermissoes, setModalPermissoes] = useState(false)
  const [resetandoSenha, setResetandoSenha] = useState<string | null>(null)

  async function handleResetarSenha(prof: any) {
    if (!confirm(`Resetar a senha de ${prof.name} para 123456?`)) return
    setResetandoSenha(prof.id)
    await fetch(`/api/equipe/${prof.id}/resetar-senha`, { method: "POST" })
    setResetandoSenha(null)
  }

  useEffect(() => {
    buscarEquipe()
    fetchJsonSafe<any[]>("/api/servicos", "servicos:lista").then(d => setServicos(d ?? []))
  }, [])

  // fetchJsonSafe mantém o último dado bom em cache se a busca falhar — nunca
  // zera a lista de profissionais por causa de uma falha transitória.
  async function buscarEquipe(forcar = false) {
    if (cacheEquipe.current && !forcar) { setEquipe(cacheEquipe.current); setLoading(false); return }
    setLoading(true)
    const lista = (await fetchJsonSafe<any[]>("/api/equipe", "equipe:lista")) ?? []
    cacheEquipe.current = lista
    setEquipe(lista)
    setLoading(false)
  }

  async function handleCriar(dados: any) {
    setSalvando(true); setErroModal("")
    try {
      const res = await fetch("/api/equipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) })
      if (!res.ok) { setErroModal("Erro ao salvar."); return }
      cacheEquipe.current = null; await buscarEquipe(true); setModalNovo(false)
    } catch { setErroModal("Erro inesperado.") } finally { setSalvando(false) }
  }

  async function handleEditar(dados: any) {
    if (!profSelecionado) return
    setSalvando(true); setErroModal("")
    try {
      const res = await fetch(`/api/equipe/${profSelecionado.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) })
      if (!res.ok) { setErroModal("Erro ao salvar."); return }
      cacheEquipe.current = null; await buscarEquipe(true); setModalEditar(false); setProfSelecionado(null)
    } catch { setErroModal("Erro inesperado.") } finally { setSalvando(false) }
  }

  async function handleExcluir() {
    if (!profSelecionado) return
    setExcluindo(true)
    try {
      await fetch(`/api/equipe/${profSelecionado.id}`, { method: "DELETE" })
      cacheEquipe.current = null; await buscarEquipe(true); setModalExcluir(false); setProfSelecionado(null)
    } catch {} finally { setExcluindo(false) }
  }

  const equipeFiltrada = equipe.filter(p =>
    filtro === "todos" ? true : filtro === "ativos" ? p.isActive : !p.isActive
  )

  const totalAtivos = equipe.filter(p => p.isActive).length
  const totalInativos = equipe.filter(p => !p.isActive).length

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Equipe</h1>
          <p className="text-zinc-500 text-sm">{totalAtivos} ativos · {totalInativos} inativos · CLT · PJ · MEI · Autônomo</p>
        </div>
        <button onClick={() => { setErroModal(""); setModalNovo(true) }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Profissional
        </button>
      </div>

      {/* Filtro */}
      <div className="flex gap-2 mb-4">
        {([["ativos", `Ativos (${totalAtivos})`], ["inativos", `Inativos (${totalInativos})`], ["todos", `Todos (${equipe.length})`]] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filtro === val ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">Carregando equipe...</div>
        ) : equipeFiltrada.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="text-zinc-600 text-sm">
              {filtro === "inativos" ? "Nenhum profissional inativo" : "Nenhum profissional cadastrado ainda"}
            </div>
          </div>
        ) : equipeFiltrada.map((prof) => {
          const idade = calcularIdade(prof.birthDate)
          const tempoCasa = calcularTempoCasa(prof.admissionDate)
          return (
            <div key={prof.id} onClick={() => { setProfSelecionado(prof); setErroModal(""); setModalEditar(true) }}
              className={`bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 transition-colors cursor-pointer ${prof.isActive ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-800 opacity-60"}`}>
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {prof.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-white text-sm font-medium">{prof.name}</span>
                  {prof.role && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${roleBadge(prof.role)}`}>
                      {roleLabel(prof.role)}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${vinculoStyle[prof.employmentType] ?? vinculoStyle.CLT}`}>
                    {vinculoLabel[prof.employmentType] ?? prof.employmentType}
                  </span>
                  {prof.attendsHome && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">Domicílio</span>}
                  {!prof.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-500 border border-zinc-600">Inativo</span>}
                </div>
                <div className="text-zinc-500 text-xs">
                  {prof.username && <span className="text-amber-500/70 font-mono">@{prof.username} · </span>}
                  {prof.email}{prof.phone ? ` · ${prof.phone}` : ""}{idade ? ` · ${idade} anos` : ""}
                </div>
                {tempoCasa && (
                  <div className="text-zinc-600 text-xs mt-0.5">🏠 {tempoCasa} de casa</div>
                )}
                {prof.userServices?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {prof.userServices.slice(0, 3).map((us: any) => (
                      <span key={us.serviceId} className="text-xs px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{us.service?.name}</span>
                    ))}
                    {prof.userServices.length > 3 && <span className="text-xs text-zinc-600">+{prof.userServices.length - 3}</span>}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-amber-400 font-bold text-sm">{prof.commissionPct ? `${prof.commissionPct}%` : "—"}</div>
                <div className="text-zinc-600 text-xs">
                  {prof.employmentType === "MEI" ? "comissão + bancada" : prof.employmentType === "SOLO" ? "PIX direto" : "de comissão"}
                </div>
                {prof.breakBetweenAppts && <div className="text-zinc-600 text-xs">{prof.breakBetweenAppts}min intervalo</div>}
              </div>
              <div className="flex-shrink-0 flex flex-col gap-1.5">
                <button onClick={e => { e.stopPropagation(); setProfSelecionado(prof); setModalPermissoes(true) }}
                  className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors whitespace-nowrap">
                  🔐 Acesso
                </button>
                {prof.username && (
                  <button
                    onClick={e => { e.stopPropagation(); handleResetarSenha(prof) }}
                    disabled={resetandoSenha === prof.id}
                    className="bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50 whitespace-nowrap">
                    {resetandoSenha === prof.id ? "..." : "🔑 Resetar"}
                  </button>
                )}
                <button onClick={e => { e.stopPropagation(); setProfSelecionado(prof); setModalExcluir(true) }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors">
                  Desativar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="text-blue-400 text-xs font-mono uppercase tracking-widest mb-1">Lei do Salão Parceiro · Lei 13.352/2016</div>
        <div className="text-zinc-400 text-sm">Profissionais MEI têm gestão adaptada à legislação brasileira.</div>
      </div>

      {modalNovo && <FormularioProfissional titulo="Novo Profissional" servicos={servicos} onSalvar={handleCriar} onCancelar={() => setModalNovo(false)} salvando={salvando} erro={erroModal} />}
      {modalEditar && profSelecionado && <FormularioProfissional titulo="Editar Profissional" inicial={profSelecionado} servicos={servicos} onSalvar={handleEditar} onCancelar={() => { setModalEditar(false); setProfSelecionado(null) }} salvando={salvando} erro={erroModal} />}
      {modalPermissoes && profSelecionado && <PermissoesModal prof={profSelecionado} onFechar={() => { setModalPermissoes(false); setProfSelecionado(null) }} />}

      {modalExcluir && profSelecionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-white font-bold text-lg mb-2">Desativar profissional?</h2>
            <p className="text-zinc-400 text-sm mb-1"><span className="text-white font-medium">{profSelecionado.name}</span> será marcado como inativo.</p>
            <p className="text-zinc-600 text-xs mb-6">O histórico de atendimentos será preservado. Você pode reativar pelo botão Editar.</p>
            <div className="flex gap-3">
              <button onClick={() => { setModalExcluir(false); setProfSelecionado(null) }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={handleExcluir} disabled={excluindo}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 font-medium px-4 py-2.5 rounded-lg text-sm border border-red-500/20 transition-colors">
                {excluindo ? "Desativando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}