"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { clearPwaCache } from "@/lib/clearPwaCache"

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

const defaultHours = DIAS.map((label, i) => ({
  dayOfWeek: i, label,
  isOpen: i >= 1 && i <= 6,
  startTime: "09:00", endTime: "19:00", markup: 0,
}))

const inputCls = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"

function fmtCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (!d) return ""
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}
function fmtTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (!d) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
function fmtWhatsapp(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 13)
  if (!d) return ""
  if (d.length <= 2) return `+${d}`
  if (d.length <= 4) return `+${d.slice(0, 2)} (${d.slice(2)}`
  if (d.length <= 9) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`
  if (d.length <= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
}
function fmtCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8)
  if (!d) return ""
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ""
  return new Date(iso).toISOString().split("T")[0]
}

// Componente de seção colapsável
function Secao({ titulo, id, badge, colapsados, toggle, children }: {
  titulo: string
  id: string
  badge?: React.ReactNode
  colapsados: Set<string>
  toggle: (id: string) => void
  children: React.ReactNode
}) {
  const colapsado = colapsados.has(id)
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button type="button" onClick={() => toggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors text-left">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{titulo}</span>
          {badge}
        </div>
        <svg className={`w-4 h-4 text-zinc-500 transition-transform flex-shrink-0 ${colapsado ? "" : "rotate-180"}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {!colapsado && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/60">
          {children}
        </div>
      )}
    </div>
  )
}

function WlContainer() {
  const [nomeMarca, setNomeMarca] = useState("Barbearia Costa")
  const [corPrimaria, setCorPrimaria] = useState("#c9a84c")
  const [corSecundaria, setCorSecundaria] = useState("#26c9b2")
  const [dominio, setDominio] = useState("")
  const [slogan, setSlogan] = useState("")
  const [salvo, setSalvo] = useState(false)

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  return (
    <div className="pt-2 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={handleSalvar} className="space-y-3">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Nome da marca *</label>
            <input value={nomeMarca} onChange={e => setNomeMarca(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Slogan</label>
            <input value={slogan} onChange={e => setSlogan(e.target.value)}
              placeholder="Estilo e precisão em cada corte"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Domínio personalizado</label>
            <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500 transition-colors">
              <span className="text-zinc-600 text-xs px-3 border-r border-zinc-700 py-2">https://</span>
              <input value={dominio} onChange={e => setDominio(e.target.value)}
                placeholder="seu-dominio.com"
                className="flex-1 bg-transparent text-white px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Cor primária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-zinc-800" />
                <input value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none font-mono" />
              </div>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Cor secundária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={corSecundaria} onChange={e => setCorSecundaria(e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-zinc-800" />
                <input value={corSecundaria} onChange={e => setCorSecundaria(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none font-mono" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              Salvar
            </button>
            {salvo && <span className="text-green-400 text-sm">✓ Salvo</span>}
          </div>
        </form>

        {/* Preview compacto */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden text-xs">
          <div className="flex">
            <div className="w-24 bg-zinc-900 border-r border-zinc-800 p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-black text-xs flex-shrink-0" style={{ backgroundColor: corPrimaria }}>
                  {nomeMarca.charAt(0)}
                </div>
                <div className="text-white text-xs font-bold truncate">{nomeMarca.split(" ")[0]}</div>
              </div>
              {["Dashboard", "Agenda", "Clientes"].map(item => (
                <div key={item} className="text-zinc-500 text-[10px] py-0.5 px-1.5 rounded mb-0.5">{item}</div>
              ))}
            </div>
            <div className="flex-1 p-2">
              <div className="text-white font-bold text-xs mb-0.5">{nomeMarca}</div>
              {slogan && <div className="text-zinc-600 text-[10px] italic mb-2">{slogan}</div>}
              <div className="grid grid-cols-2 gap-1.5">
                {[{ label: "Faturamento", val: "R$ 1.840", col: corPrimaria }, { label: "Clientes", val: "247", col: corSecundaria }].map(kpi => (
                  <div key={kpi.label} className="bg-zinc-800 rounded p-1.5 border-t-2" style={{ borderColor: kpi.col }}>
                    <div className="text-zinc-500 text-[10px]">{kpi.label}</div>
                    <div className="font-bold text-xs" style={{ color: kpi.col }}>{kpi.val}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-1">
                <button className="px-2 py-1 rounded text-[10px] font-bold text-black" style={{ backgroundColor: corPrimaria }}>+ Agendar</button>
                <button className="px-2 py-1 rounded text-[10px] font-bold text-black" style={{ backgroundColor: corSecundaria }}>Fila</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession()
  const isOwner = ["ADMIN", "ORG_OWNER"].includes(session?.user?.role ?? "")
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erroMsg, setErroMsg] = useState("")
  const [salvandoPlaylists, setSalvandoPlaylists] = useState(false)
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setColapsados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // WhatsApp / Evolution API
  const [wStatus, setWStatus] = useState<"loading" | "connected" | "disconnected" | "error">("loading")
  const [wQr, setWQr] = useState<string | null>(null)
  const [wReconectando, setWReconectando] = useState(false)
  const [wInstance, setWInstance] = useState("")

  const fetchWStatus = useCallback(() => {
    fetch("/api/whatsapp/status")
      .then(r => r.json())
      .then(d => {
        const state = d?.instance?.state ?? d?.state ?? ""
        setWInstance(d?.instance?.instanceName ?? "")
        setWStatus(state === "open" ? "connected" : state ? "disconnected" : "error")
      })
      .catch(() => setWStatus("error"))
  }, [])

  async function reconectarWhats() {
    setWReconectando(true)
    setWQr(null)
    try {
      const res = await fetch("/api/whatsapp/status", { method: "POST" })
      const data = await res.json()
      // Evolution API retorna base64 na raiz ou dentro de qrcode
      const qr = data?.base64 ?? data?.qrcode?.base64 ?? null
      if (qr) setWQr(qr)
      // Verifica status após 5s para detectar conexão
      setTimeout(fetchWStatus, 5000)
    } catch {}
    finally { setWReconectando(false) }
  }

  async function salvarPainelConfig(config: { playlists: { label: string; url: string }[]; playlistAtivaIdx: number; slots: any[] }) {
    setSalvandoPlaylists(true)
    try {
      await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ painelConfig: config }),
      })
    } catch {}
    finally { setSalvandoPlaylists(false) }
  }

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
  const [businessHours, setBusinessHours] = useState(defaultHours)
  const [cashbackConfig, setCashbackConfig] = useState({ servicos: 7, domicilio: 5, produtos: 3, assinaturas: 10 })
  const [painelConfig, setPainelConfig] = useState<{
    playlists: { label: string; url: string }[]
    playlistAtivaIdx: number
    slots: { id: string; type: string; titulo?: string; texto?: string; cor?: string; duracao: number; ativo: boolean }[]
  }>({ playlists: [], playlistAtivaIdx: 0, slots: [{ id: "fila", type: "fila", duracao: 30, ativo: true }] })
  const [novaPlaylistLabel, setNovaPlaylistLabel] = useState("")
  const [novaPlaylistUrl, setNovaPlaylistUrl] = useState("")
  const [novoSlotTipo, setNovoSlotTipo] = useState("promocao")
  const [novoSlotTitulo, setNovoSlotTitulo] = useState("")
  const [novoSlotTexto, setNovoSlotTexto] = useState("")
  const [novoSlotDuracao, setNovoSlotDuracao] = useState("15")
  const [novoSlotCor, setNovoSlotCor] = useState("amber")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadandoLogo, setUploadandoLogo] = useState(false)
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null)
  const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null)
  const [uploadandoOrgLogo, setUploadandoOrgLogo] = useState(false)

  useEffect(() => {
    fetch("/api/configuracoes")
      .then(r => r.json())
      .then(d => {
        if (!d || d.error) return
        setNome(d.name ?? "")
        setSlug(d.slug ?? "")
        setTelefone(fmtTelefone(d.phone ?? ""))
        setEmail(d.email ?? "")
        setEndereco(d.address ?? "")
        setCidade(d.city ?? "")
        setEstado(d.state ?? "")
        setCep(fmtCep(d.zipCode ?? ""))
        setInauguratedAt(toDateInput(d.inauguratedAt))
        setPixKey(d.pixKey ?? "")
        setWhatsapp(fmtWhatsapp(d.whatsapp ?? ""))
        setInstagram(d.instagram ?? "")
        setCnpj(fmtCnpj(d.cnpj ?? ""))
        setRazaoSocial(d.razaoSocial ?? "")
        setInscricaoMunicipal(d.inscricaoMunicipal ?? "")
        setRegimeTributario(d.regimeTributario ?? "Simples Nacional")
        // Logo da unidade — se não tiver própria, herda da org
        setLogoUrl(d.logoUrl ?? d.orgLogoUrl ?? null)
        setOrgLogoUrl(d.orgLogoUrl ?? null)
        if (d.businessHours && Array.isArray(d.businessHours)) setBusinessHours(d.businessHours)
        if (d.cashbackConfig && typeof d.cashbackConfig === "object") setCashbackConfig(prev => ({ ...prev, ...d.cashbackConfig }))
        if (d.painelConfig && typeof d.painelConfig === "object") setPainelConfig(prev => ({ ...prev, ...(d.painelConfig as object) }))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    fetchWStatus()
  }, [fetchWStatus])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    setUploadandoLogo(true)
    try {
      const fd = new FormData()
      fd.append("logo", file)
      const res = await fetch("/api/configuracoes/logo", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Erro ao enviar logo"); return }
      setLogoUrl(data.url)
      window.dispatchEvent(new CustomEvent("logoAtualizada", { detail: data.url }))
    } catch (err) { alert(String(err)) }
    finally { setUploadandoLogo(false) }
  }

  async function handleOrgLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOrgLogoPreview(URL.createObjectURL(file))
    setUploadandoOrgLogo(true)
    try {
      const fd = new FormData()
      fd.append("logo", file)
      const res = await fetch("/api/org/logo", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Erro ao enviar logo da organização"); return }
      setOrgLogoUrl(data.url)
      window.dispatchEvent(new CustomEvent("logoAtualizada", { detail: data.url }))
    } catch (err) { alert(String(err)) }
    finally { setUploadandoOrgLogo(false) }
  }

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvando(true); setErroMsg("")
    try {
      const res = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome, slug, phone: telefone, email,
          address: endereco, city: cidade, state: estado, zipCode: cep,
          inauguratedAt: inauguratedAt || null,
          pixKey, whatsapp: whatsapp.replace(/\D/g, ""), instagram,
          cnpj: cnpj.replace(/\D/g, "") || null,
          razaoSocial: razaoSocial || null,
          inscricaoMunicipal: inscricaoMunicipal || null,
          regimeTributario: regimeTributario || null,
          businessHours, cashbackConfig, painelConfig,
          logoUrl: logoUrl?.split("?")[0],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErroMsg(data.error || "Erro ao salvar"); return }
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
      window.dispatchEvent(new CustomEvent("estabelecimentoAtualizado", { detail: data }))
    } catch (err) { setErroMsg(String(err)) }
    finally { setSalvando(false) }
  }

  function toggleDia(idx: number) {
    setBusinessHours(prev => prev.map((d, i) => i === idx ? { ...d, isOpen: !d.isOpen } : d))
  }
  function setHorario(idx: number, field: "startTime" | "endTime", value: string) {
    setBusinessHours(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const logoSrc = logoPreview || logoUrl

  if (loading) return (
    <DashboardLayout>
      <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">Configurações do Estabelecimento</h1>
          <p className="text-zinc-500 text-sm mt-1">Dados da sua barbearia</p>
        </div>

        <form onSubmit={handleSalvar} className="space-y-3">

          {/* Logo */}
          <Secao titulo="Logo" id="logo" colapsados={colapsados} toggle={toggle}>

            {/* Logo da organização — visível apenas para ORG_OWNER/ADMIN */}
            {isOwner && (
              <div className="pt-3 pb-4 border-b border-zinc-800 mb-4">
                <p className="text-zinc-400 text-xs font-semibold mb-3">Logo da organização</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 flex items-center justify-center">
                    {(orgLogoPreview || orgLogoUrl) ? (
                      <img src={orgLogoPreview || orgLogoUrl!} alt="Logo da org" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-600 text-xs text-center px-1">Sem logo</span>
                    )}
                  </div>
                  <div>
                    <label className={`inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg border border-zinc-700 transition-colors cursor-pointer ${uploadandoOrgLogo ? "opacity-50 cursor-not-allowed" : ""}`}>
                      {uploadandoOrgLogo ? "Enviando..." : "Enviar logo da organização"}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleOrgLogoChange} disabled={uploadandoOrgLogo} />
                    </label>
                    <p className="text-zinc-600 text-xs mt-1">PNG, JPG, WebP ou SVG · máx 3MB · todas as unidades herdam esta logo</p>
                    {orgLogoUrl && !orgLogoPreview && <p className="text-green-400 text-xs mt-1">✓ Logo da organização configurada</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Logo desta unidade */}
            <p className="text-zinc-400 text-xs font-semibold mb-3 pt-1">Logo desta unidade</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 flex items-center justify-center">
                {logoSrc ? (
                  <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">{nome.charAt(0) || "B"}</span>
                )}
              </div>
              <div>
                <label className={`inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg border border-zinc-700 transition-colors cursor-pointer ${uploadandoLogo ? "opacity-50 cursor-not-allowed" : ""}`}>
                  {uploadandoLogo ? "Enviando..." : "Enviar logo da unidade"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} disabled={uploadandoLogo} />
                </label>
                <p className="text-zinc-600 text-xs mt-1">PNG, JPG, WebP ou SVG · máx 3MB · sobrepõe a logo da organização</p>
                {orgLogoUrl && !logoPreview && !logoUrl && (
                  <p className="text-zinc-500 text-xs mt-1">Usando logo da organização por padrão</p>
                )}
                {logoUrl && <p className="text-green-400 text-xs mt-1">✓ Logo própria da unidade</p>}
              </div>
            </div>
          </Secao>

          {/* Informações básicas */}
          <Secao titulo="Informações básicas" id="info" colapsados={colapsados} toggle={toggle}>
            <div className="pt-3">
              <label className="text-zinc-400 text-xs mb-1 block">Nome do estabelecimento</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Barbearia Costa" />
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
                <input value={telefone} onChange={e => setTelefone(fmtTelefone(e.target.value))} className={inputCls} placeholder="(11) 99999-9999" inputMode="numeric" />
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
                  <input value={whatsapp} onChange={e => setWhatsapp(fmtWhatsapp(e.target.value))} placeholder="+55 (11) 99999-9999" inputMode="numeric" className="flex-1 bg-transparent text-white px-2 py-2 text-sm outline-none" />
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
              <label className="text-zinc-400 text-xs mb-1 block">Chave PIX do estabelecimento</label>
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
                <div key={dia.dayOfWeek} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${dia.isOpen ? "bg-zinc-800" : "bg-zinc-800/30"}`}>
                  <button type="button" onClick={() => toggleDia(idx)}
                    className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 flex-shrink-0 ${dia.isOpen ? "bg-amber-500 justify-end" : "bg-zinc-700 justify-start"}`}>
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
                      className="w-28 accent-amber-500" />
                    <span className="text-amber-400 font-bold text-sm w-8 text-right">{cashbackConfig[key]}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Secao>

          {/* WhatsApp — Evolution API */}
          <Secao titulo="WhatsApp — Evolution API" id="whatsapp"
            badge={
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border font-mono ${
                wStatus === "connected" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                wStatus === "disconnected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                wStatus === "loading" ? "bg-zinc-800 text-zinc-500 border-zinc-700" :
                "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                {wStatus === "connected" ? "● Conectado" : wStatus === "disconnected" ? "○ Desconectado" : wStatus === "loading" ? "..." : "Erro"}
              </span>
            }
            colapsados={colapsados} toggle={toggle}>
            <div className="pt-3 space-y-3">
              {/* Status atual */}
              <div className="bg-zinc-800 rounded-lg px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">Instância</span>
                  <span className="text-white text-xs font-mono">{wInstance || process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || "barberos"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">Status</span>
                  <span className={`text-xs font-semibold ${wStatus === "connected" ? "text-green-400" : "text-red-400"}`}>
                    {wStatus === "connected" ? "Conectado" : wStatus === "disconnected" ? "Desconectado" : wStatus === "loading" ? "Verificando..." : "Sem resposta"}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              {wQr && (
                <div className="flex flex-col items-center gap-2 bg-white rounded-xl p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={wQr} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  <p className="text-zinc-700 text-xs text-center">Escaneie com o WhatsApp para conectar</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2">
                <button type="button" onClick={fetchWStatus}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium py-2 rounded-lg border border-zinc-700 transition-colors">
                  Verificar status
                </button>
                <button type="button" onClick={reconectarWhats} disabled={wReconectando}
                  className="flex-1 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-400 text-sm font-medium py-2 rounded-lg border border-green-500/20 transition-colors">
                  {wReconectando ? "Conectando..." : wStatus === "connected" ? "Reconectar" : "Conectar"}
                </button>
              </div>
              <p className="text-zinc-600 text-xs">Ao clicar em Conectar, um QR Code aparecerá acima. Escaneie com o WhatsApp do número que enviará as mensagens.</p>
            </div>
          </Secao>

          {/* Painel TV — Playlists */}
          <Secao titulo="Painel TV — Playlists do YouTube" id="tv-playlists"
            badge={salvandoPlaylists ? <span className="ml-2 text-zinc-600 text-xs">Salvando...</span> : undefined}
            colapsados={colapsados} toggle={toggle}>
            <div className="pt-3 space-y-2">
              {painelConfig.playlists.length === 0 && (
                <div className="text-zinc-600 text-xs">Nenhuma playlist cadastrada</div>
              )}
              {painelConfig.playlists.map((p, idx) => {
                const ativa = painelConfig.playlistAtivaIdx === idx
                return (
                  <div key={idx} className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors cursor-pointer ${ativa ? "bg-amber-500/10 border-amber-500/30" : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"}`}
                    onClick={() => {
                      const nova = { ...painelConfig, playlistAtivaIdx: idx }
                      setPainelConfig(nova)
                      salvarPainelConfig(nova)
                    }}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ativa ? "bg-amber-500" : "bg-zinc-600"}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium truncate ${ativa ? "text-amber-400" : "text-white"}`}>{p.label}</div>
                      <div className="text-zinc-600 text-xs truncate">{p.url}</div>
                    </div>
                    {ativa && <span className="text-amber-500 text-xs flex-shrink-0">Ativa</span>}
                    <button type="button" onClick={e => {
                      e.stopPropagation()
                      const novas = painelConfig.playlists.filter((_, i) => i !== idx)
                      const novoIdx = painelConfig.playlistAtivaIdx >= novas.length ? Math.max(0, novas.length - 1) : painelConfig.playlistAtivaIdx
                      const nova = { ...painelConfig, playlists: novas, playlistAtivaIdx: novoIdx }
                      setPainelConfig(nova)
                      salvarPainelConfig(nova)
                    }} className="text-zinc-600 hover:text-red-400 text-sm transition-colors flex-shrink-0 ml-1">✕</button>
                  </div>
                )
              })}
              <div className="space-y-2 border-t border-zinc-800 pt-3">
                <input value={novaPlaylistLabel} onChange={e => setNovaPlaylistLabel(e.target.value)}
                  placeholder="Nome (ex: Lo-fi, Trap, Sertanejo)"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 placeholder:text-zinc-600" />
                <input value={novaPlaylistUrl} onChange={e => setNovaPlaylistUrl(e.target.value)}
                  placeholder="URL do YouTube (vídeo ou playlist)"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 placeholder:text-zinc-600" />
                <button type="button" disabled={!novaPlaylistUrl.trim() || salvandoPlaylists}
                  onClick={() => {
                    if (!novaPlaylistUrl.trim()) return
                    const nova = { ...painelConfig, playlists: [...painelConfig.playlists, { label: novaPlaylistLabel.trim() || `Playlist ${painelConfig.playlists.length + 1}`, url: novaPlaylistUrl.trim() }] }
                    setPainelConfig(nova); salvarPainelConfig(nova)
                    setNovaPlaylistLabel(""); setNovaPlaylistUrl("")
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold py-2 rounded-lg text-sm transition-colors">
                  {salvandoPlaylists ? "Salvando..." : "+ Adicionar playlist"}
                </button>
              </div>
            </div>
          </Secao>

          {/* Painel TV — Slots de Conteúdo */}
          <Secao titulo="Painel TV — Slots de Conteúdo" id="tv-slots" colapsados={colapsados} toggle={toggle}>
            <p className="text-zinc-600 text-xs pt-3">Configure o que aparece no painel da recepção e por quanto tempo.</p>
            <div className="space-y-2">
              {painelConfig.slots.map((s, idx) => (
                <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${s.ativo ? "bg-zinc-800 border-zinc-700" : "bg-zinc-800/40 border-zinc-800 opacity-60"}`}>
                  <button type="button" onClick={() => setPainelConfig(prev => ({ ...prev, slots: prev.slots.map((sl, i) => i === idx ? { ...sl, ativo: !sl.ativo } : sl) }))}
                    className={`w-8 h-5 rounded-full flex-shrink-0 relative transition-colors ${s.ativo ? "bg-amber-500" : "bg-zinc-700"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${s.ativo ? "left-4" : "left-0.5"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium">{s.type === "fila" ? "Fila de espera" : s.titulo || "Sem título"}</div>
                    {s.texto && <div className="text-zinc-500 text-xs truncate">{s.texto}</div>}
                  </div>
                  <div className="text-zinc-600 text-xs flex-shrink-0">{s.duracao}s</div>
                  {s.type !== "fila" && (
                    <button type="button" onClick={() => setPainelConfig(prev => ({ ...prev, slots: prev.slots.filter((_, i) => i !== idx) }))}
                      className="text-zinc-600 hover:text-red-400 text-sm transition-colors flex-shrink-0">✕</button>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={novoSlotTipo} onChange={e => setNovoSlotTipo(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500">
                  <option value="promocao">Promoção</option>
                  <option value="aviso">Aviso / Info</option>
                  <option value="instagram">Instagram post</option>
                </select>
                <div className="flex items-center gap-2">
                  <input type="number" value={novoSlotDuracao} onChange={e => setNovoSlotDuracao(e.target.value)}
                    className="w-20 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500" />
                  <span className="text-zinc-500 text-xs">segundos</span>
                </div>
              </div>
              <input value={novoSlotTitulo} onChange={e => setNovoSlotTitulo(e.target.value)} placeholder="Título do slot"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 placeholder:text-zinc-600" />
              <textarea value={novoSlotTexto} onChange={e => setNovoSlotTexto(e.target.value)} rows={2} placeholder="Texto ou URL (para Instagram)"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 placeholder:text-zinc-600 resize-none" />
              <div className="flex gap-2">
                {["amber", "green", "blue", "red", "purple"].map(cor => (
                  <button key={cor} type="button" onClick={() => setNovoSlotCor(cor)}
                    className={`w-6 h-6 rounded-full border-2 transition-colors ${novoSlotCor === cor ? "border-white" : "border-transparent"} ${
                      cor === "amber" ? "bg-amber-500" : cor === "green" ? "bg-green-500" : cor === "blue" ? "bg-blue-500" : cor === "red" ? "bg-red-500" : "bg-purple-500"
                    }`} />
                ))}
                <span className="text-zinc-500 text-xs self-center ml-1">Cor</span>
              </div>
              <button type="button"
                onClick={() => {
                  if (!novoSlotTitulo.trim()) return
                  const novo = { id: `${novoSlotTipo}-${Date.now()}`, type: novoSlotTipo, titulo: novoSlotTitulo.trim(), texto: novoSlotTexto.trim(), cor: novoSlotCor, duracao: parseInt(novoSlotDuracao) || 15, ativo: true }
                  setPainelConfig(prev => ({ ...prev, slots: [...prev.slots, novo] }))
                  setNovoSlotTitulo(""); setNovoSlotTexto("")
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-lg text-sm border border-zinc-700 transition-colors">
                + Adicionar slot
              </button>
            </div>
          </Secao>

          {/* Plano */}
          <Secao titulo="White Label & Marca" id="white-label" colapsados={colapsados} toggle={toggle}
            badge={<span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Business</span>}>
            <WlContainer />
          </Secao>

          <Secao titulo="Plano atual" id="plano" colapsados={colapsados} toggle={toggle}>
            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="text-amber-400 font-bold">Plano Pro</div>
                <div className="text-zinc-500 text-xs mt-0.5">Até 5 profissionais · R$ 99–149/mês</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Ativo</span>
            </div>
          </Secao>

          {erroMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">{erroMsg}</div>
          )}
          <div className="flex items-center gap-3 pb-8">
            <button type="submit" disabled={salvando}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
            {salvo && <span className="text-green-400 text-sm">✓ Salvo com sucesso</span>}
          </div>

        </form>

        {/* Sistema */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-3">
          <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Sistema</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-zinc-300 text-sm font-medium">Limpar cache do app</div>
              <div className="text-zinc-600 text-xs mt-0.5">Remove caches do PWA. Use se o app estiver mostrando conteúdo desatualizado.</div>
            </div>
            <LimparCacheBtn />
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}

function LimparCacheBtn() {
  const [estado, setEstado] = useState<"idle" | "limpando" | "ok">("idle")

  async function handle() {
    setEstado("limpando")
    await clearPwaCache()
    setEstado("ok")
    setTimeout(() => {
      setEstado("idle")
      window.location.reload()
    }, 1200)
  }

  return (
    <button onClick={handle} disabled={estado !== "idle"}
      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        estado === "ok"
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-50"
      }`}>
      {estado === "limpando" ? "Limpando..." : estado === "ok" ? "✓ Limpo" : "Limpar cache"}
    </button>
  )
}
