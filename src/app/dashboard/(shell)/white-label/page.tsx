"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Card, { SectionTitle } from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Badge from "@/components/ui/Badge"
import { Field, Input } from "@/components/ui/Field"
import { MARCA_PADRAO, corValida, corParaEixoAcento, type Marca } from "@/lib/marca"

// A identidade fica em Organization.orgConfig.marca, via /api/org/marca. A cor
// primaria alimenta o acento do tema (ver AplicadorMarca + src/lib/tema.ts):
// dela o sistema usa o HUE e o CROMA, e nao a luminosidade — os stops de
// claridade sao fixos no globals.css, pra garantir contraste de texto legivel
// com qualquer cor de marca.

const CINZA_NEUTRO = "#71717a"

export default function WhiteLabelPage() {
  const [marca, setMarca] = useState<Marca>(MARCA_PADRAO)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const timerSalvo = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let vivo = true
    fetch("/api/org/marca")
      .then(r => r.json())
      .then(d => {
        if (!vivo) return
        if (d?.error) { setErro(d.error); return }
        setMarca({
          nome: d.nome ?? "",
          slogan: d.slogan ?? "",
          corPrimaria: d.corPrimaria ?? "",
          corSecundaria: d.corSecundaria ?? "",
          dominio: d.dominio ?? "",
        })
        setLogoUrl(d.logoUrl ?? null)
      })
      .catch(() => { if (vivo) setErro("Não foi possível carregar a identidade da marca.") })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])

  useEffect(() => () => clearTimeout(timerSalvo.current), [])

  function definir<K extends keyof Marca>(campo: K, valor: Marca[K]) {
    setMarca(m => ({ ...m, [campo]: valor }))
    setSalvo(false)
  }

  const primariaInvalida = marca.corPrimaria !== "" && !corValida(marca.corPrimaria)
  const secundariaInvalida = marca.corSecundaria !== "" && !corValida(marca.corSecundaria)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (primariaInvalida || secundariaInvalida) return
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch("/api/org/marca", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(marca),
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.error ?? "Erro ao salvar."); return }
      setMarca({ ...MARCA_PADRAO, ...d })
      // O AplicadorMarca ouve isso e repinta o acento sem recarregar a pagina.
      window.dispatchEvent(new CustomEvent("marcaAlterada", { detail: d.corPrimaria ?? "" }))
      setSalvo(true)
      timerSalvo.current = setTimeout(() => setSalvo(false), 3000)
    } catch {
      setErro("Erro de rede. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  async function enviarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    setEnviandoLogo(true)
    setErro(null)
    try {
      const fd = new FormData()
      fd.append("logo", file)
      const res = await fetch("/api/org/logo", { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) { setErro(d.error ?? "Erro ao enviar a logo."); setLogoPreview(null); return }
      setLogoUrl(d.url)
      window.dispatchEvent(new CustomEvent("logoAtualizada", { detail: d.url }))
    } catch {
      setErro("Erro de rede ao enviar a logo.")
      setLogoPreview(null)
    } finally {
      setEnviandoLogo(false)
      e.target.value = ""
    }
  }

  const logoSrc = logoPreview ?? logoUrl
  const inicial = (marca.nome.trim().charAt(0) || "B").toUpperCase()

  // Cores do preview: caem num cinza neutro enquanto o campo estiver vazio ou
  // invalido, pra nunca renderizar backgroundColor com string vazia.
  const primaria = corValida(marca.corPrimaria) ? marca.corPrimaria : CINZA_NEUTRO
  const secundaria = corValida(marca.corSecundaria) ? marca.corSecundaria : CINZA_NEUTRO

  // Mostra o que a cor vai virar de fato como acento do sistema.
  const eixo = useMemo(
    () => (corValida(marca.corPrimaria) ? corParaEixoAcento(marca.corPrimaria) : null),
    [marca.corPrimaria],
  )

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-fg text-xl font-bold">White-label &amp; Marca</h1>
          <p className="text-fg-3 text-sm">Personalize o sistema com a identidade visual do seu negócio</p>
        </div>
        <Badge tone="info" className="flex-shrink-0">Plano Business</Badge>
      </div>

      {erro && <Card tone="danger" className="mb-4 text-red-400 text-sm">{erro}</Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ----------------------------- formulário ----------------------------- */}
        <form onSubmit={salvar} className="space-y-4">
          <Card className="space-y-3">
            <SectionTitle>Identidade da marca</SectionTitle>

            <Field label="Nome da marca" htmlFor="wl-nome" hint="Aparece na sidebar e nos documentos.">
              <Input
                id="wl-nome"
                value={marca.nome}
                onChange={e => definir("nome", e.target.value)}
                disabled={carregando}
                maxLength={60}
                placeholder="Barbearia Costa"
              />
            </Field>

            <Field label="Slogan" htmlFor="wl-slogan">
              <Input
                id="wl-slogan"
                value={marca.slogan}
                onChange={e => definir("slogan", e.target.value)}
                disabled={carregando}
                maxLength={120}
                placeholder="Estilo e precisão em cada corte"
              />
            </Field>

            <Field label="Logo da marca" hint="PNG, JPG, WEBP ou SVG, até 3 MB.">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center text-2xl font-bold flex-shrink-0 border border-line"
                  style={{ backgroundColor: logoSrc ? undefined : primaria }}
                >
                  {logoSrc
                    ? <img src={logoSrc} alt="Logo da marca" className="w-full h-full object-cover" />
                    : <span className="text-black">{inicial}</span>}
                </div>
                <label className={enviandoLogo ? "opacity-50 pointer-events-none" : undefined}>
                  <span className="inline-flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 text-fg-strong border border-line text-sm px-4 min-h-11 cursor-pointer transition-colors">
                    {enviandoLogo ? "Enviando…" : logoSrc ? "Trocar logo" : "Enviar logo"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={enviarLogo}
                    disabled={enviandoLogo || carregando}
                  />
                </label>
              </div>
            </Field>
          </Card>

          <Card className="space-y-3">
            <SectionTitle>Cores do sistema</SectionTitle>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Cor primária"
                htmlFor="wl-primaria"
                erro={primariaInvalida ? "Use o formato #rrggbb." : undefined}
                hint={!primariaInvalida && eixo ? `Vira o acento do sistema (hue ${eixo.h}, croma ${eixo.c}).` : undefined}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Escolher cor primária"
                    value={corValida(marca.corPrimaria) ? marca.corPrimaria : CINZA_NEUTRO}
                    onChange={e => definir("corPrimaria", e.target.value)}
                    disabled={carregando}
                    className="w-11 h-11 rounded-xl border border-line bg-surface-2 cursor-pointer flex-shrink-0"
                  />
                  <Input
                    id="wl-primaria"
                    value={marca.corPrimaria}
                    onChange={e => definir("corPrimaria", e.target.value)}
                    disabled={carregando}
                    maxLength={7}
                    placeholder="#c9a84c"
                    className="font-mono"
                  />
                </div>
              </Field>

              <Field
                label="Cor secundária"
                htmlFor="wl-secundaria"
                erro={secundariaInvalida ? "Use o formato #rrggbb." : undefined}
                hint={!secundariaInvalida ? "Usada só em destaques e gráficos." : undefined}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Escolher cor secundária"
                    value={corValida(marca.corSecundaria) ? marca.corSecundaria : CINZA_NEUTRO}
                    onChange={e => definir("corSecundaria", e.target.value)}
                    disabled={carregando}
                    className="w-11 h-11 rounded-xl border border-line bg-surface-2 cursor-pointer flex-shrink-0"
                  />
                  <Input
                    id="wl-secundaria"
                    value={marca.corSecundaria}
                    onChange={e => definir("corSecundaria", e.target.value)}
                    disabled={carregando}
                    maxLength={7}
                    placeholder="#26c9b2"
                    className="font-mono"
                  />
                </div>
              </Field>
            </div>

            <p className="text-fg-4 text-xs">
              Depois de salvar, a cor primária fica disponível como acento{" "}
              <strong className="text-fg-3">Marca</strong> em Aparência, e passa a ser o padrão de quem ainda não
              escolheu uma cor no próprio dispositivo.
            </p>
          </Card>

          <Card className="space-y-3">
            <SectionTitle>Domínio personalizado</SectionTitle>
            <Field label="Domínio" htmlFor="wl-dominio">
              <div className="flex items-center bg-surface-2 border border-line rounded-xl overflow-hidden focus-within:border-accent transition-colors">
                <span className="text-fg-4 text-xs px-3 border-r border-line self-stretch flex items-center">https://</span>
                <input
                  id="wl-dominio"
                  value={marca.dominio}
                  onChange={e => definir("dominio", e.target.value)}
                  disabled={carregando}
                  maxLength={120}
                  placeholder="barbearia-costa.com"
                  className="flex-1 bg-transparent text-fg px-3 min-h-11 text-base md:text-sm outline-none placeholder:text-fg-4"
                />
              </div>
            </Field>
            <Card tone="info" padding="sm" className="text-xs text-fg-2">
              O domínio fica registrado aqui, mas o apontamento ainda{" "}
              <strong className="text-fg">não está ativo</strong>: depende de configuração de DNS e certificado no
              servidor. Fale com o suporte para habilitar.
            </Card>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="accent"
              disabled={salvando || carregando || primariaInvalida || secundariaInvalida}
            >
              {salvando ? "Salvando…" : "Salvar configurações"}
            </Button>
            {salvo && <span className="text-green-400 text-sm">✓ Salvo com sucesso</span>}
          </div>
        </form>

        {/* ------------------------------- preview ------------------------------ */}
        <div>
          <SectionTitle className="mb-3">Preview em tempo real</SectionTitle>

          <Card padding="none" tone="ghost" className="bg-surface-0 overflow-hidden">
            <div className="flex">
              {/* sidebar mini */}
              <div className="w-32 bg-surface-1 border-r border-line p-3 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: logoSrc ? undefined : primaria }}
                  >
                    {logoSrc
                      ? <img src={logoSrc} alt="" className="w-full h-full object-cover" />
                      : <span className="text-black">{inicial}</span>}
                  </div>
                  <div className="text-fg text-xs font-bold truncate">
                    {marca.nome.split(" ")[0] || "Marca"}
                  </div>
                </div>
                {["Dashboard", "Agenda", "Clientes", "Financeiro"].map(item => (
                  <div key={item} className="text-fg-3 text-xs py-1 px-2 rounded mb-0.5">{item}</div>
                ))}
              </div>

              {/* conteúdo mini */}
              <div className="flex-1 p-3 min-w-0">
                <div className="text-fg text-xs font-bold truncate">{marca.nome || "Sua marca"}</div>
                <div className="text-fg-4 text-xs mb-3 italic truncate">
                  {marca.slogan || "Seu slogan aparece aqui"}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Faturamento", val: "R$ 1.840", cor: primaria },
                    { label: "Clientes", val: "247", cor: secundaria },
                  ].map(kpi => (
                    <div
                      key={kpi.label}
                      className="bg-surface-2 rounded-lg p-2 border-t-2"
                      style={{ borderColor: kpi.cor }}
                    >
                      <div className="text-fg-3 text-xs truncate">{kpi.label}</div>
                      <div className="text-sm font-bold" style={{ color: kpi.cor }}>{kpi.val}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-surface-2 rounded-lg p-2 flex items-center justify-between gap-2">
                  <span className="text-fg-2 text-xs flex-shrink-0">Agendamento</span>
                  <span className="text-xs font-mono truncate" style={{ color: primaria }}>
                    {marca.dominio || "seu-dominio.com"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-line p-3 flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-black"
                style={{ backgroundColor: primaria }}
              >
                + Agendar
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-black"
                style={{ backgroundColor: secundaria }}
              >
                Ver fila
              </button>
            </div>
          </Card>

          <Card className="mt-3">
            <SectionTitle className="mb-2">URL do sistema</SectionTitle>
            <div className="font-mono text-sm break-all" style={{ color: primaria }}>
              https://{marca.dominio || "seu-dominio.com"}
            </div>
            <p className="text-fg-4 text-xs mt-1">
              Configure o CNAME do seu DNS apontando para:{" "}
              <span className="font-mono text-fg-3">app.barberos.com</span>
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
