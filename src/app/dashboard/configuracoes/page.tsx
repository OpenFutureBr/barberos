"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

const defaultHours = DIAS.map((label, i) => ({
  dayOfWeek: i,
  label,
  isOpen: i >= 1 && i <= 6,
  startTime: "09:00",
  endTime: "19:00",
  markup: 0,
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

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erroMsg, setErroMsg] = useState("")

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
  const [cashbackConfig, setCashbackConfig] = useState({
    servicos: 7,
    domicilio: 5,
    produtos: 3,
    assinaturas: 10,
  })

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadandoLogo, setUploadandoLogo] = useState(false)

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
        setLogoUrl(d.logoUrl ?? null)
        if (d.businessHours && Array.isArray(d.businessHours)) {
          setBusinessHours(d.businessHours)
        }
        if (d.cashbackConfig && typeof d.cashbackConfig === "object") {
          setCashbackConfig(prev => ({ ...prev, ...d.cashbackConfig }))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

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

  async function handleSalvar(e: { preventDefault: () => void }) {
    e.preventDefault()
    setSalvando(true); setErroMsg("")
    try {
      const res = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome,
          slug,
          phone: telefone,
          email,
          address: endereco,
          city: cidade,
          state: estado,
          zipCode: cep,
          inauguratedAt: inauguratedAt || null,
          pixKey,
          whatsapp: whatsapp.replace(/\D/g, ""),
          instagram,
          cnpj: cnpj.replace(/\D/g, "") || null,
          razaoSocial: razaoSocial || null,
          inscricaoMunicipal: inscricaoMunicipal || null,
          regimeTributario: regimeTributario || null,
          businessHours,
          cashbackConfig,
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
  function setMarkup(idx: number, value: number) {
    setBusinessHours(prev => prev.map((d, i) => i === idx ? { ...d, markup: value } : d))
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

        <form onSubmit={handleSalvar} className="space-y-4">

          {/* Logo */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Logo</div>
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
                  {uploadandoLogo ? "Enviando..." : "Enviar logo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} disabled={uploadandoLogo} />
                </label>
                <p className="text-zinc-600 text-xs mt-1">PNG, JPG ou WebP · máx 3MB</p>
                {logoUrl && <p className="text-green-400 text-xs mt-1">✓ Logo carregada</p>}
              </div>
            </div>
          </div>

          {/* Informações básicas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Informações básicas</div>
            <div>
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
                <input
                  value={telefone}
                  onChange={e => setTelefone(fmtTelefone(e.target.value))}
                  className={inputCls}
                  placeholder="(11) 99999-9999"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} placeholder="contato@barbearia.com" />
              </div>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Data de inauguração</label>
              <input
                type="date"
                value={inauguratedAt}
                onChange={e => setInauguratedAt(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
          </div>

          {/* Contato & Pagamento */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Contato & Pagamento</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">WhatsApp</label>
                <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-amber-500">
                  <span className="text-zinc-600 text-xs px-2 py-2">💬</span>
                  <input
                    value={whatsapp}
                    onChange={e => setWhatsapp(fmtWhatsapp(e.target.value))}
                    placeholder="+55 (11) 99999-9999"
                    inputMode="numeric"
                    className="flex-1 bg-transparent text-white px-2 py-2 text-sm outline-none"
                  />
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
          </div>

          {/* Endereço */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Endereço</div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Endereço</label>
              <input value={endereco} onChange={e => setEndereco(e.target.value)} className={inputCls} placeholder="Rua das Flores, 123" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">CEP</label>
                <input
                  value={cep}
                  onChange={e => setCep(fmtCep(e.target.value))}
                  className={inputCls}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
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
          </div>

          {/* Dados fiscais */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Dados fiscais</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">CNPJ</label>
                <input
                  value={cnpj}
                  onChange={e => setCnpj(fmtCnpj(e.target.value))}
                  className={inputCls}
                  placeholder="00.000.000/0001-00"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Inscrição Municipal</label>
                <input
                  value={inscricaoMunicipal}
                  onChange={e => setInscricaoMunicipal(e.target.value)}
                  className={inputCls}
                  placeholder="000000-0"
                />
              </div>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Razão Social</label>
              <input
                value={razaoSocial}
                onChange={e => setRazaoSocial(e.target.value)}
                className={inputCls}
                placeholder="Barbearia Costa Ltda"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Regime tributário</label>
              <select
                value={regimeTributario}
                onChange={e => setRegimeTributario(e.target.value)}
                className={inputCls}
              >
                <option>Simples Nacional</option>
                <option>Lucro Presumido</option>
                <option>Lucro Real</option>
                <option>MEI</option>
              </select>
            </div>
          </div>

          {/* Horário de funcionamento */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-4">Horário de funcionamento</div>
            <div className="space-y-2">
              {businessHours.map((dia, idx) => (
                <div key={dia.dayOfWeek} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${dia.isOpen ? "bg-zinc-800" : "bg-zinc-800/30"}`}>
                  <button type="button" onClick={() => toggleDia(idx)}
                    className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 flex-shrink-0 ${dia.isOpen ? "bg-amber-500 justify-end" : "bg-zinc-700 justify-start"}`}>
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                  <span className={`text-sm w-16 flex-shrink-0 ${dia.isOpen ? "text-white font-medium" : "text-zinc-600"}`}>
                    {dia.label}
                  </span>
                  {dia.isOpen ? (
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <input type="time" value={dia.startTime} onChange={e => setHorario(idx, "startTime", e.target.value)}
                        className="bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm outline-none focus:border-amber-500 transition-colors [color-scheme:dark]" />
                      <span className="text-zinc-500 text-xs">até</span>
                      <input type="time" value={dia.endTime} onChange={e => setHorario(idx, "endTime", e.target.value)}
                        className="bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm outline-none focus:border-amber-500 transition-colors [color-scheme:dark]" />
                    </div>
                  ) : (
                    <span className="text-zinc-600 text-xs">Fechado</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cashback */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-1">Cashback por categoria</div>
            <p className="text-zinc-600 text-xs mb-4">Percentual creditado automaticamente ao cliente após cada pagamento confirmado.</p>
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
                    <input
                      type="range" min="0" max="20" step="1"
                      value={cashbackConfig[key]}
                      onChange={e => setCashbackConfig(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                      className="w-28 accent-amber-500"
                    />
                    <span className="text-amber-400 font-bold text-sm w-8 text-right">{cashbackConfig[key]}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plano */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-mono mb-3">Plano atual</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-amber-400 font-bold">Plano Pro</div>
                <div className="text-zinc-500 text-xs mt-0.5">Até 5 profissionais · R$ 99–149/mês</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Ativo</span>
            </div>
          </div>

          {erroMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">{erroMsg}</div>
          )}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={salvando}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
            {salvo && <span className="text-green-400 text-sm">✓ Salvo com sucesso</span>}
          </div>

        </form>
      </div>
    </DashboardLayout>
  )
}
