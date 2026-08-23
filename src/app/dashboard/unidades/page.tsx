"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { fetchJsonSafe } from "@/lib/safe-fetch"

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

type BizHour = { dayOfWeek: number; label: string; isOpen: boolean; startTime: string; endTime: string; markup: number }
type CashbackCfg = { servicos: number; domicilio: number; produtos: number; assinaturas: number }

const defaultHours = (): BizHour[] =>
  DIAS.map((label, i) => ({ dayOfWeek: i, label, isOpen: i >= 1 && i <= 6, startTime: "09:00", endTime: "19:00", markup: 0 }))

type Unidade = {
  id: string
  name: string
  slug: string
  plan: string
  isActive: boolean
  city: string | null
  state: string | null
  logoUrl: string | null
  updatedAt: string
  _count: { users: number; clients: number; appointments: number }
}

// Imagem em cache por 1 ano (ver supabase-storage.ts) — ?v= usa updatedAt
// como carimbo de versão, trocando a URL quando a foto é atualizada.
function fotoComVersao(url: string | null | undefined, updatedAt: string | null | undefined) {
  if (!url || !updatedAt) return url ?? null
  return `${url}${url.includes("?") ? "&" : "?"}v=${new Date(updatedAt).getTime()}`
}

type ConfigFull = {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  pixKey: string | null
  whatsapp: string | null
  instagram: string | null
  inauguratedAt: string | null
  cnpj: string | null
  razaoSocial: string | null
  inscricaoMunicipal: string | null
  regimeTributario: string | null
  businessHours: BizHour[] | null
  cashbackConfig: CashbackCfg | null
  logoUrl: string | null
  painelConfig: { playlistAtivaIdx?: number } | null
}

// ---- formatters ----
function fmtCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}
function fmtTel(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
function fmtWa(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 13)
  if (d.length <= 2) return `+${d}`
  if (d.length <= 4) return `+${d.slice(0, 2)} (${d.slice(2)}`
  if (d.length <= 9) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`
  if (d.length <= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
}
function fmtCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}
function toDateInput(iso: string | null | undefined) {
  if (!iso) return ""
  return new Date(iso).toISOString().split("T")[0]
}

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

const planBadge: Record<string, string> = {
  PRO: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  BUSINESS: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  START: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
}

// ---- Secao colapsável ----
function Secao({ titulo, id, colapsados, toggle, children }: {
  titulo: string; id: string; colapsados: Set<string>; toggle: (id: string) => void; children: React.ReactNode
}) {
  const fechado = colapsados.has(id)
  return (
    <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl overflow-hidden">
      <button type="button" onClick={() => toggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-700/30 transition-colors text-left">
        <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{titulo}</span>
        <svg className={`w-4 h-4 text-zinc-500 transition-transform flex-shrink-0 ${fechado ? "" : "rotate-180"}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {!fechado && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-700/40">
          {children}
        </div>
      )}
    </div>
  )
}

// ---- Modal de config por unidade ----
function ConfigModal({ unidadeId, onClose, onSalvo }: { unidadeId: string; onClose: () => void; onSalvo: () => void }) {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState("")
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())
  const [uploadando, setUploadando] = useState(false)

  function toggle(id: string) {
    setColapsados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // form state
  const [nome, setNome] = useState("")
  const [slug, setSlug] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [endereco, setEndereco] = useState("")
  const [cidade, setCidade] = useState("")
  const [estado, setEstado] = useState("")
  const [cep, setCep] = useState("")
  const [inauguratedAt, setInauguratedAt] = useState("")
  const [pixKey, setPixKey] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [instagram, setInstagram] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [razaoSocial, setRazaoSocial] = useState("")
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState("")
  const [regimeTributario, setRegimeTributario] = useState("Simples Nacional")
  const [businessHours, setBusinessHours] = useState<BizHour[]>(defaultHours())
  const [cashbackConfig, setCashbackConfig] = useState<CashbackCfg>({ servicos: 7, domicilio: 5, produtos: 3, assinaturas: 10 })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null)

  // Serviços por unidade
  type SvcItem = { id: string; name: string; price: number; durationMin: number; category: string | null; establishmentId: string; isEnabled: boolean }
  const [servicos, setServicos] = useState<SvcItem[]>([])
  const [salvandoServicos, setSalvandoServicos] = useState(false)

  // Playlists da org
  type Playlist = { label: string; url: string }
  const [orgPlaylists, setOrgPlaylists] = useState<Playlist[]>([])
  const [playlistAtivaIdx, setPlaylistAtivaIdx] = useState<number>(-1)
  const [salvandoPlaylist, setSalvandoPlaylist] = useState(false)

  function toggleServico(id: string) {
    setServicos(prev => prev.map(s => s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
  }

  async function salvarServicos() {
    setSalvandoServicos(true)
    await fetch(`/api/unidades/${unidadeId}/servicos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicos.map(s => ({ serviceId: s.id, isEnabled: s.isEnabled }))),
    })
    setSalvandoServicos(false)
  }

  async function salvarPlaylist() {
    if (playlistAtivaIdx < 0) return
    setSalvandoPlaylist(true)
    const painelConfig = { playlists: orgPlaylists, playlistAtivaIdx }
    await fetch(`/api/unidades/${unidadeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ painelConfig }),
    })
    setSalvandoPlaylist(false)
  }

  useEffect(() => {
    fetchJsonSafe<any[]>(`/api/unidades/${unidadeId}/servicos`, `unidade:${unidadeId}:servicos`)
      .then(d => { if (d) setServicos(d) })

    fetchJsonSafe<{ playlists?: any[] }>("/api/org/config", "org:config")
      .then(d => {
        if (Array.isArray(d?.playlists)) setOrgPlaylists(d.playlists)
      })

    // Logo da organização para exibir como fallback
    fetchJsonSafe<{ logoUrl?: string }>("/api/org/info", "org:info")
      .then(d => { if (d?.logoUrl) setOrgLogoUrl(d.logoUrl) })
  }, [unidadeId])

  useEffect(() => {
    // fetchJsonSafe mantém o último config bom em cache — sem isso, uma falha
    // transitória limparia todo o formulário (nome, endereço, config etc.)
    fetchJsonSafe<ConfigFull>(`/api/unidades/${unidadeId}`, `unidade:${unidadeId}:config`)
      .then((d) => {
        if (!d) return
        setNome(d.name ?? "")
        setSlug(d.slug ?? "")
        setTelefone(fmtTel(d.phone ?? ""))
        setEmail(d.email ?? "")
        setEndereco(d.address ?? "")
        setCidade(d.city ?? "")
        setEstado(d.state ?? "")
        setCep(fmtCep(d.zipCode ?? ""))
        setInauguratedAt(toDateInput(d.inauguratedAt))
        setPixKey(d.pixKey ?? "")
        setWhatsapp(fmtWa(d.whatsapp ?? ""))
        setInstagram(d.instagram ?? "")
        setCnpj(fmtCnpj(d.cnpj ?? ""))
        setRazaoSocial(d.razaoSocial ?? "")
        setInscricaoMunicipal(d.inscricaoMunicipal ?? "")
        setRegimeTributario(d.regimeTributario ?? "Simples Nacional")
        setLogoUrl(d.logoUrl ?? null)
        if (Array.isArray(d.businessHours)) setBusinessHours(d.businessHours)
        if (d.cashbackConfig) setCashbackConfig(prev => ({ ...prev, ...d.cashbackConfig }))
        if (d.painelConfig?.playlistAtivaIdx !== undefined) setPlaylistAtivaIdx(d.painelConfig.playlistAtivaIdx)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [unidadeId])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    setUploadando(true)
    try {
      const fd = new FormData()
      fd.append("logo", file)
      const res = await fetch(`/api/unidades/${unidadeId}/logo`, { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Erro ao enviar logo"); return }
      setLogoUrl(data.url)
    } catch (err) { alert(String(err)) }
    finally { setUploadando(false) }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setErro("")
    try {
      const res = await fetch(`/api/unidades/${unidadeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome, slug,
          phone: telefone.replace(/\D/g, "") || null,
          email: email || null,
          address: endereco || null,
          city: cidade || null,
          state: estado || null,
          zipCode: cep.replace(/\D/g, "") || null,
          pixKey: pixKey || null,
          whatsapp: whatsapp.replace(/\D/g, "") || null,
          instagram: instagram || null,
          inauguratedAt: inauguratedAt || null,
          cnpj: cnpj.replace(/\D/g, "") || null,
          razaoSocial: razaoSocial || null,
          inscricaoMunicipal: inscricaoMunicipal || null,
          regimeTributario,
          businessHours, cashbackConfig,
          logoUrl: logoUrl?.split("?")[0] ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || "Erro ao salvar"); return }
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
      onSalvo()
    } catch (err) { setErro(String(err)) }
    finally { setSalvando(false) }
  }

  function toggleDia(idx: number) {
    setBusinessHours(prev => prev.map((d, i) => i === idx ? { ...d, isOpen: !d.isOpen } : d))
  }
  function setHorario(idx: number, field: "startTime" | "endTime", value: string) {
    setBusinessHours(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const logoSrc = logoPreview || logoUrl

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-stretch justify-end">
      <div className="w-full max-w-xl bg-zinc-900 flex flex-col h-full overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold">{nome || "Configurações da Unidade"}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">barberos.com/{slug}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Carregando...</div>
        ) : (
          <form onSubmit={handleSalvar} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

            {/* Logo */}
            <Secao titulo="Logo" id="logo" colapsados={colapsados} toggle={toggle}>
              <div className="flex items-center gap-4 pt-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 flex items-center justify-center relative">
                  {(logoPreview || logoUrl || orgLogoUrl)
                    ? <img src={logoPreview || logoUrl || orgLogoUrl!} alt="Logo" className="w-full h-full object-cover" />
                    : <span className="text-white font-bold text-2xl">{nome.charAt(0) || "B"}</span>}
                  {!logoUrl && !logoPreview && orgLogoUrl && (
                    <div className="absolute bottom-0 right-0 bg-zinc-900 rounded text-zinc-500 text-[9px] px-1">org</div>
                  )}
                </div>
                <div>
                  <label className={`inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg border border-zinc-700 transition-colors cursor-pointer ${uploadando ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {uploadando ? "Enviando..." : "Enviar logo própria"}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} disabled={uploadando} />
                  </label>
                  <p className="text-zinc-600 text-xs mt-1">PNG, JPG, WebP ou SVG · máx 3 MB</p>
                  {!logoUrl && !logoPreview && orgLogoUrl && (
                    <p className="text-zinc-500 text-xs mt-1">Usando logo da organização por padrão</p>
                  )}
                  {logoUrl && <p className="text-green-400 text-xs mt-1">✓ Logo própria desta unidade</p>}
                </div>
              </div>
            </Secao>

            {/* Informações básicas */}
            <Secao titulo="Informações básicas" id="info" colapsados={colapsados} toggle={toggle}>
              <div className="pt-3">
                <label className="text-zinc-400 text-xs mb-1 block">Nome da unidade *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required className={inputCls} placeholder="Barbearia Costa — Vila Madalena" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Link de agendamento</label>
                <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500 transition-colors">
                  <span className="text-zinc-600 text-xs px-3 border-r border-zinc-700 py-2">barberos.com/</span>
                  <input value={slug} onChange={e => setSlug(e.target.value)} className="flex-1 bg-transparent text-white px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Telefone</label>
                  <input value={telefone} onChange={e => setTelefone(fmtTel(e.target.value))} className={inputCls} placeholder="(11) 99999-9999" inputMode="numeric" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} placeholder="contato@barbearia.com" />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Data de inauguração</label>
                <input type="date" value={inauguratedAt} onChange={e => setInauguratedAt(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
              </div>
            </Secao>

            {/* Contato & Pagamento */}
            <Secao titulo="Contato & Pagamento" id="contato" colapsados={colapsados} toggle={toggle}>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">WhatsApp</label>
                  <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500">
                    <span className="text-zinc-600 text-xs px-2 py-2">💬</span>
                    <input value={whatsapp} onChange={e => setWhatsapp(fmtWa(e.target.value))} placeholder="+55 (11) 99999-9999" inputMode="numeric" className="flex-1 bg-transparent text-white px-2 py-2 text-sm outline-none" />
                  </div>
                  <p className="text-zinc-600 text-xs mt-0.5">Com código do país (+55)</p>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Instagram</label>
                  <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500">
                    <span className="text-zinc-600 text-xs px-2 py-2">@</span>
                    <input value={instagram} onChange={e => setInstagram(e.target.value.replace("@", ""))} placeholder="barbearia.costa" className="flex-1 bg-transparent text-white px-2 py-2 text-sm outline-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Chave PIX</label>
                <input value={pixKey} onChange={e => setPixKey(e.target.value)} className={inputCls} placeholder="CPF, CNPJ, email, telefone ou chave aleatória" />
              </div>
            </Secao>

            {/* Endereço */}
            <Secao titulo="Endereço" id="endereco" colapsados={colapsados} toggle={toggle}>
              <div className="pt-3">
                <label className="text-zinc-400 text-xs mb-1 block">Endereço</label>
                <input value={endereco} onChange={e => setEndereco(e.target.value)} className={inputCls} placeholder="Rua das Flores, 123" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">CEP</label>
                  <input value={cep} onChange={e => setCep(fmtCep(e.target.value))} className={inputCls} placeholder="00000-000" inputMode="numeric" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Cidade</label>
                  <input value={cidade} onChange={e => setCidade(e.target.value)} className={inputCls} placeholder="São Paulo" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Estado</label>
                  <input value={estado} onChange={e => setEstado(e.target.value)} className={inputCls} placeholder="SP" maxLength={2} />
                </div>
              </div>
            </Secao>

            {/* Dados fiscais */}
            <Secao titulo="Dados fiscais" id="fiscal" colapsados={colapsados} toggle={toggle}>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">CNPJ</label>
                  <input value={cnpj} onChange={e => setCnpj(fmtCnpj(e.target.value))} className={inputCls} placeholder="00.000.000/0001-00" inputMode="numeric" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Inscrição Municipal</label>
                  <input value={inscricaoMunicipal} onChange={e => setInscricaoMunicipal(e.target.value)} className={inputCls} placeholder="000000-0" />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Razão Social</label>
                <input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} className={inputCls} placeholder="Barbearia Costa Ltda" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Regime tributário</label>
                <select value={regimeTributario} onChange={e => setRegimeTributario(e.target.value)} className={inputCls}>
                  <option>Simples Nacional</option>
                  <option>Lucro Presumido</option>
                  <option>Lucro Real</option>
                  <option>MEI</option>
                </select>
              </div>
            </Secao>

            {/* Horário de funcionamento */}
            <Secao titulo="Horário de funcionamento" id="horario" colapsados={colapsados} toggle={toggle}>
              <div className="space-y-2 pt-3">
                {businessHours.map((dia, idx) => (
                  <div key={dia.dayOfWeek} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${dia.isOpen ? "bg-zinc-700/50" : "bg-zinc-800/30"}`}>
                    <button type="button" onClick={() => toggleDia(idx)}
                      className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 flex-shrink-0 ${dia.isOpen ? "bg-amber-500 justify-end" : "bg-zinc-600 justify-start"}`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow" />
                    </button>
                    <span className={`text-sm w-16 flex-shrink-0 ${dia.isOpen ? "text-white font-medium" : "text-zinc-600"}`}>{dia.label}</span>
                    {dia.isOpen ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={dia.startTime} onChange={e => setHorario(idx, "startTime", e.target.value)}
                          className="bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm outline-none focus:border-amber-500 [color-scheme:dark]" />
                        <span className="text-zinc-500 text-xs">até</span>
                        <input type="time" value={dia.endTime} onChange={e => setHorario(idx, "endTime", e.target.value)}
                          className="bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm outline-none focus:border-amber-500 [color-scheme:dark]" />
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs">Fechado</span>
                    )}
                  </div>
                ))}
              </div>
            </Secao>

            {/* Cashback */}
            <Secao titulo="Cashback por categoria" id="cashback" colapsados={colapsados} toggle={toggle}>
              <p className="text-zinc-600 text-xs pt-3">Percentual creditado automaticamente após cada pagamento confirmado.</p>
              <div className="space-y-3">
                {([
                  { key: "servicos", label: "Serviços presenciais" },
                  { key: "domicilio", label: "Serviços a domicílio" },
                  { key: "produtos", label: "Produtos (PDV)" },
                  { key: "assinaturas", label: "Planos / Assinaturas" },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="flex-1 text-white text-sm">{label}</span>
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="20" step="1"
                        value={cashbackConfig[key]}
                        onChange={e => setCashbackConfig(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                        className="w-24 accent-amber-500" />
                      <span className="text-amber-400 font-bold text-sm w-8 text-right">{cashbackConfig[key]}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Secao>

            {/* Serviços desta unidade */}
            <Secao titulo="Serviços desta unidade" id="servicos-unidade" colapsados={colapsados} toggle={toggle}>
              <p className="text-zinc-600 text-xs pt-3">Ative ou desative os serviços disponíveis nesta unidade. Serviços cadastrados em outras unidades da organização podem ser habilitados aqui.</p>
              {servicos.length === 0 ? (
                <p className="text-zinc-500 text-sm pt-3">Nenhum serviço cadastrado na organização.</p>
              ) : (
                <div className="space-y-1 pt-3">
                  {Array.from(new Set(servicos.map(s => s.category ?? "Sem categoria"))).map(cat => (
                    <div key={cat} className="mb-3">
                      <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1">{cat}</p>
                      <div className="space-y-1">
                        {servicos.filter(s => (s.category ?? "Sem categoria") === cat).map(s => (
                          <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                            <div
                              onClick={() => toggleServico(s.id)}
                              className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${s.isEnabled ? "bg-amber-500" : "bg-zinc-700"}`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${s.isEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                            </div>
                            <span className={`text-sm transition-colors ${s.isEnabled ? "text-white" : "text-zinc-500"}`}>{s.name}</span>
                            <span className="text-zinc-600 text-xs ml-auto">R$ {s.price.toFixed(2)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={salvarServicos} disabled={salvandoServicos}
                    className="mt-2 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors">
                    {salvandoServicos ? "Salvando..." : "Salvar serviços"}
                  </button>
                </div>
              )}
            </Secao>

            {/* Painel TV — Playlist */}
            <Secao titulo="Painel TV — Playlist" id="painel-playlist" colapsados={colapsados} toggle={toggle}>
              <p className="text-zinc-600 text-xs pt-3">Escolha qual playlist a TV desta unidade irá exibir. Playlists são gerenciadas pelo proprietário da organização.</p>
              {orgPlaylists.length === 0 ? (
                <p className="text-zinc-500 text-sm pt-3">Nenhuma playlist configurada na organização.</p>
              ) : (
                <div className="space-y-2 pt-3">
                  {orgPlaylists.map((pl, idx) => (
                    <label key={idx} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="playlist" value={idx}
                        checked={playlistAtivaIdx === idx}
                        onChange={() => setPlaylistAtivaIdx(idx)}
                        className="accent-amber-500" />
                      <span className="text-sm text-white">{pl.label}</span>
                      <span className="text-zinc-600 text-xs truncate max-w-[200px]">{pl.url}</span>
                    </label>
                  ))}
                  <button type="button" onClick={salvarPlaylist} disabled={salvandoPlaylist || playlistAtivaIdx < 0}
                    className="mt-2 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors">
                    {salvandoPlaylist ? "Salvando..." : "Salvar playlist"}
                  </button>
                </div>
              )}
            </Secao>

            {erro && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">{erro}</div>
            )}

            <div className="flex items-center gap-3 pb-6">
              <button type="submit" disabled={salvando}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
              {salvo && <span className="text-green-400 text-sm">✓ Salvo</span>}
              <button type="button" onClick={onClose} className="ml-auto text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                Fechar
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}

// ---- Página principal ----
export default function UnidadesPage() {
  const { data: session, update } = useSession()
  const estabAtualId = session?.user?.establishmentId
  const [trocando, setTrocando] = useState<string | null>(null)

  async function acessarUnidade(id: string) {
    setTrocando(id)
    await update({ establishmentId: id })
    window.location.href = "/dashboard"
  }

  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [configAbertoId, setConfigAbertoId] = useState<string | null>(null)
  const [modalNova, setModalNova] = useState(false)
  const [criando, setCriando] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [novaCidade, setNovaCidade] = useState("")
  const [novoEstado, setNovoEstado] = useState("")
  const [erroCriacao, setErroCriacao] = useState("")

  const carregar = useCallback(() => {
    setLoading(true)
    // fetchJsonSafe mantém a última lista boa em cache se a busca falhar —
    // nunca zera as unidades por causa de uma falha transitória.
    fetchJsonSafe<any[]>("/api/unidades", "unidades:lista")
      .then(d => { if (d) setUnidades(d) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criarUnidade(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setCriando(true); setErroCriacao("")
    try {
      const res = await fetch("/api/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: novoNome.trim(), city: novaCidade.trim() || null, state: novoEstado.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { setErroCriacao(data.error || "Erro ao criar"); return }
      setModalNova(false)
      setNovoNome(""); setNovaCidade(""); setNovoEstado("")
      carregar()
    } catch (err) { setErroCriacao(String(err)) }
    finally { setCriando(false) }
  }

  const total = {
    profissionais: unidades.reduce((s, u) => s + u._count.users, 0),
    clientes: unidades.reduce((s, u) => s + u._count.clients, 0),
    hoje: unidades.reduce((s, u) => s + u._count.appointments, 0),
  }

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">Multi-unidades</h1>
          <p className="text-zinc-500 text-sm">
            {loading ? "Carregando..." : `${unidades.length} unidade${unidades.length !== 1 ? "s" : ""} · Dashboard consolidado`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/unidades/relatorio"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg text-sm border border-zinc-700 transition-colors"
          >
            Gerar relatório executivo
          </a>
          <button
            onClick={() => setModalNova(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Nova unidade
          </button>
        </div>
      </div>

      {/* KPIs consolidados */}
      {!loading && unidades.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Consolidado — todas as unidades</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-zinc-500 text-xs mb-1">Profissionais ativos</div>
              <div className="text-purple-400 text-2xl font-bold">{total.profissionais}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Clientes cadastrados</div>
              <div className="text-blue-400 text-2xl font-bold">{total.clientes.toLocaleString("pt-BR")}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs mb-1">Atendimentos hoje</div>
              <div className="text-amber-400 text-2xl font-bold">{total.hoje}</div>
            </div>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!loading && unidades.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <div className="text-zinc-600 text-4xl mb-3">🏢</div>
          <div className="text-white font-medium mb-1">Nenhuma unidade cadastrada</div>
          <div className="text-zinc-500 text-sm mb-4">Clique em "Nova unidade" para adicionar sua primeira filial.</div>
          <button onClick={() => setModalNova(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            + Nova unidade
          </button>
        </div>
      )}

      {/* Cards das unidades */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-48" />
                  <div className="h-3 bg-zinc-800 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {unidades.map(unidade => (
            <div key={unidade.id}
              className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${expandido === unidade.id ? "border-amber-500/40" : "border-zinc-800 hover:border-zinc-700"}`}>

              {/* Header do card */}
              <div className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpandido(expandido === unidade.id ? null : unidade.id)}>
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-amber-500 flex items-center justify-center">
                  {unidade.logoUrl
                    ? <img src={fotoComVersao(unidade.logoUrl, unidade.updatedAt) ?? undefined} alt="Logo" loading="lazy" className="w-full h-full object-cover" />
                    : <span className="text-black font-bold">{unidade.name.charAt(0)}</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-white font-medium">{unidade.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${planBadge[unidade.plan] ?? planBadge.START}`}>
                      {unidade.plan}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${unidade.isActive ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-zinc-700 text-zinc-400 border-zinc-600"}`}>
                      {unidade.isActive ? "● Ativa" : "○ Inativa"}
                    </span>
                    {unidade.id === estabAtualId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-medium">
                        ◈ Em uso
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-500 text-xs">
                    {[unidade.city, unidade.state].filter(Boolean).join(" · ")}
                    {unidade.slug && ` · ${unidade.slug}`}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-right">
                  <div>
                    <div className="text-purple-400 font-bold">{unidade._count.users}</div>
                    <div className="text-zinc-600 text-xs">profissionais</div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-bold">{unidade._count.clients}</div>
                    <div className="text-zinc-600 text-xs">clientes</div>
                  </div>
                  <div>
                    <div className="text-amber-400 font-bold">{unidade._count.appointments}</div>
                    <div className="text-zinc-600 text-xs">hoje</div>
                  </div>
                </div>
                <div className="text-zinc-500 text-sm flex-shrink-0 ml-2">
                  {expandido === unidade.id ? "▲" : "▼"}
                </div>
              </div>

              {/* Detalhe expandido */}
              {expandido === unidade.id && (
                <div className="border-t border-zinc-800 p-4">
                  {/* métricas mobile */}
                  <div className="grid grid-cols-3 gap-3 mb-4 sm:hidden">
                    <div className="bg-zinc-800 rounded-lg p-3 text-center">
                      <div className="text-zinc-500 text-xs mb-1">Profissionais</div>
                      <div className="text-purple-400 font-bold">{unidade._count.users}</div>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-3 text-center">
                      <div className="text-zinc-500 text-xs mb-1">Clientes</div>
                      <div className="text-blue-400 font-bold">{unidade._count.clients}</div>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-3 text-center">
                      <div className="text-zinc-500 text-xs mb-1">Hoje</div>
                      <div className="text-amber-400 font-bold">{unidade._count.appointments}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {unidade.id === estabAtualId ? (
                      <button disabled className="px-3 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-400 text-xs font-medium flex items-center gap-1.5 opacity-80">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Ativa
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); acessarUnidade(unidade.id) }}
                        disabled={trocando === unidade.id}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors">
                        {trocando === unidade.id ? "..." : "Acessar"}
                      </button>
                    )}
                    <a href={`/agendar/${unidade.slug}`} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors text-center">
                      Link público
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfigAbertoId(unidade.id) }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/20 transition-colors">
                      Configurar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nova unidade */}
      {modalNova && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Nova Unidade</h2>
              <button onClick={() => { setModalNova(false); setErroCriacao("") }} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={criarUnidade} className="p-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome da unidade *</label>
                <input
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  required
                  placeholder="Ex: Barbearia Costa — Moema"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Cidade</label>
                  <input value={novaCidade} onChange={e => setNovaCidade(e.target.value)} placeholder="São Paulo" className={inputCls} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Estado</label>
                  <input value={novoEstado} onChange={e => setNovoEstado(e.target.value)} placeholder="SP" maxLength={2} className={inputCls} />
                </div>
              </div>
              <p className="text-zinc-600 text-xs">O slug e demais configurações podem ser ajustados após a criação.</p>
              {erroCriacao && <div className="text-red-400 text-sm">{erroCriacao}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setModalNova(false); setErroCriacao("") }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={criando || !novoNome.trim()}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {criando ? "Criando..." : "Criar unidade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config drawer */}
      {configAbertoId && (
        <ConfigModal
          unidadeId={configAbertoId}
          onClose={() => setConfigAbertoId(null)}
          onSalvo={carregar}
        />
      )}

    </DashboardLayout>
  )
}
