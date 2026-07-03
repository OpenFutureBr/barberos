"use client"

import { useState, useEffect, useCallback } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import PagamentoModal from "@/components/layout/PagamentoModal"
import type { DadosPagamento } from "@/components/layout/PagamentoModal"
import { getCache, setCache } from "@/lib/prefetch-cache"

// ── PIX avulso (apenas para modal de geração manual) ────────────────────────

function crc16(str: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}
function emv(id: string, value: string) { return `${id}${String(value.length).padStart(2, "0")}${value}` }
function san(str: string, n: number) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 ]/g, " ").trim().slice(0, n).toUpperCase()
}
function gerarPix(chave: string, nome: string, cidade: string, valor: number): string {
  const merchant = emv("26", emv("00", "BR.GOV.BCB.PIX") + emv("01", chave))
  const add = emv("62", emv("05", "***"))
  const body = emv("00","01") + merchant + emv("52","0000") + emv("53","986") +
    emv("54", valor.toFixed(2)) + emv("58","BR") +
    emv("59", san(nome,25)||"BARBEROS") + emv("60", san(cidade,15)||"BRASIL") + add + "6304"
  return body + crc16(body)
}

// ── Tipos ───────────────────────────────────────────────────────────────────

type Cobranca = {
  id: string
  status: string
  scheduledAt: string
  serviceType: string
  client: { id: string; name: string; phone: string }
  service: { name: string; price: number }
  professional: { name: string }
  payment: { id: string; method: string; amount: number } | null
}

type Pendencia = {
  id: string
  appointmentId: string
  status: "PENDING" | "OVERDUE"
  amount: number
  dueDate: string | null
  createdAt: string
  scheduledAt: string
  client: { id: string; name: string; phone: string }
  service: { name: string; price: number }
  professional: { name: string }
}

type Config = { pixKey: string | null; name: string; city: string | null; whatsapp: string | null }

// ── Helpers de status ───────────────────────────────────────────────────────

function resolverStatus(c: Cobranca): { chave: string; label: string; cor: string } {
  if (c.payment) return { chave: "PAGO", label: "Pago", cor: "bg-green-500/10 text-green-400 border-green-500/20" }
  if (c.status === "DONE") return { chave: "A_COBRAR", label: "A cobrar", cor: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
  if (c.status === "CANCELLED") return { chave: "CANCELADO", label: "Cancelado", cor: "bg-red-500/10 text-red-400 border-red-500/20" }
  if (c.status === "NO_SHOW") return { chave: "NAO_COMPARECEU", label: "Não compareceu", cor: "bg-red-500/10 text-red-400 border-red-500/20" }
  if (c.status === "IN_PROGRESS") return { chave: "EM_ATENDIMENTO", label: "Em atendimento", cor: "bg-blue-500/10 text-blue-400 border-blue-500/20" }
  if (c.status === "IN_QUEUE") return { chave: "PENDENTE", label: "Na fila", cor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" }
  return { chave: "PENDENTE", label: "Agendado", cor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" }
}

const FILTROS = [
  { key: "TODOS", label: "Todos" },
  { key: "PENDENTE", label: "Pendente" },
  { key: "EM_ATENDIMENTO", label: "Em atendimento" },
  { key: "A_COBRAR", label: "A cobrar" },
  { key: "PAGO", label: "Pago" },
  { key: "CANCELADO", label: "Cancelado" },
]

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}
function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function PixPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("TODOS")

  const [dadosPagamento, setDadosPagamento] = useState<DadosPagamento | null>(null)
  const [copiado, setCopiado] = useState(false)

  // pendências
  const [pendentes, setPendentes] = useState<Pendencia[]>([])
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<Pendencia | null>(null)

  // modal gerar pix avulso
  const [modalGerar, setModalGerar] = useState(false)
  const [descGerar, setDescGerar] = useState("")
  const [valorGerar, setValorGerar] = useState("")
  const [pixAvulso, setPixAvulso] = useState<{ payload: string; valor: number; desc: string } | null>(null)

  const fetchDados = useCallback(() => {
    setLoading(true)
    const cfgCache = getCache("configuracoes")
    Promise.all([
      fetch("/api/pix/cobrancas").then(r => r.json()),
      cfgCache ? Promise.resolve(cfgCache) : fetch("/api/configuracoes").then(r => r.json()),
      fetch("/api/financeiro/pendentes").then(r => r.json()),
    ]).then(([lista, cfg, pends]) => {
      if (Array.isArray(lista)) setCobrancas(lista)
      if (cfg && !cfg.error) {
        setConfig({ pixKey: cfg.pixKey ?? null, name: cfg.name ?? "", city: cfg.city ?? null, whatsapp: cfg.whatsapp ?? null })
        if (!cfgCache) setCache("configuracoes", cfg)
      }
      if (Array.isArray(pends)) setPendentes(pends)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchDados() }, [fetchDados])

  useEffect(() => {
    function onConfirmado() { fetchDados() }
    window.addEventListener("pagamentoConfirmado", onConfirmado)
    return () => window.removeEventListener("pagamentoConfirmado", onConfirmado)
  }, [fetchDados])

  const semChave = config !== null && !config.pixKey

  const cobrancasFiltradas = cobrancas.filter(c => {
    if (filtro === "TODOS") return true
    return resolverStatus(c).chave === filtro
  })

  function gerarAvulso(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!config?.pixKey) return
    const v = parseFloat(valorGerar.replace(",", "."))
    if (isNaN(v) || v <= 0) return
    const payload = gerarPix(config.pixKey, config.name, config.city ?? "", v)
    setPixAvulso({ payload, valor: v, desc: descGerar })
    setModalGerar(false)
  }

  function copiar(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  // contadores de filtro
  const counts: Record<string, number> = { TODOS: cobrancas.length }
  cobrancas.forEach(c => {
    const k = resolverStatus(c).chave
    counts[k] = (counts[k] ?? 0) + 1
  })

  const totalPago = cobrancas.filter(c => c.payment).reduce((s, c) => s + (c.payment?.amount ?? c.service.price), 0)
  const totalHojeACobrar = cobrancas.filter(c => !c.payment && c.status === "DONE").reduce((s, c) => s + c.service.price, 0)
  const totalPendentes = pendentes.reduce((s, p) => s + p.amount, 0)
  const totalACobrar = totalHojeACobrar + totalPendentes

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white text-xl font-bold">PIX & Cobranças</h1>
          <p className="text-zinc-500 text-sm">Atendimentos do dia · Pagamentos · Geração de PIX</p>
        </div>
        <button onClick={() => setModalGerar(true)} disabled={semChave}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Gerar PIX avulso
        </button>
      </div>

      {semChave && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 text-amber-400 text-sm">
          ⚠ Chave PIX não configurada. <a href="/dashboard/configuracoes" className="underline">Configurar agora</a>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-green-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Recebido hoje</div>
          <div className="text-green-400 text-xl font-bold">{fmtMoeda(totalPago)}</div>
        </div>
        <button onClick={() => setFiltro("A_COBRAR")}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-amber-500 text-left hover:bg-zinc-800/60 transition-colors">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">A cobrar</div>
          <div className="text-amber-400 text-xl font-bold">{fmtMoeda(totalACobrar)}</div>
          {pendentes.length > 0 && (
            <div className="text-zinc-600 text-xs mt-0.5">{pendentes.length} pendência{pendentes.length !== 1 ? "s" : ""} anterior{pendentes.length !== 1 ? "es" : ""}</div>
          )}
        </button>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 border-t-2 border-t-blue-500">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Atendimentos</div>
          <div className="text-blue-400 text-xl font-bold">{cobrancas.filter(c => !["CANCELLED","NO_SHOW"].includes(c.status)).length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Chave PIX</div>
          <div className="text-white text-xs font-mono truncate">{config?.pixKey ?? "—"}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === f.key ? "bg-amber-500 text-black" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}>
            {f.label}{counts[f.key] ? ` (${counts[f.key]})` : ""}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Cobranças do dia</span>
          <span className="text-zinc-600 text-xs">{cobrancasFiltradas.length} registros</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-zinc-600 text-sm">Carregando...</div>
        ) : cobrancasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm">Nenhum registro no filtro selecionado</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Cliente</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Serviço</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Profissional</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Hora</th>
                <th className="text-right px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Valor</th>
                <th className="text-left px-4 py-2 text-zinc-600 text-xs font-mono uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {cobrancasFiltradas.map((c, i) => {
                const st = resolverStatus(c)
                const clicavel = !c.payment && !["CANCELLED","NO_SHOW"].includes(c.status)
                return (
                  <tr key={c.id}
                    onClick={() => { if (clicavel) setDadosPagamento({ appointmentId: c.id, clientName: c.client.name, serviceName: c.service.name, professionalName: c.professional.name, scheduledAt: c.scheduledAt, amount: c.service.price }) }}
                    className={`border-b border-zinc-800 transition-colors ${i === cobrancasFiltradas.length - 1 ? "border-0" : ""} ${clicavel ? "hover:bg-zinc-800/50 cursor-pointer" : "opacity-70"}`}>
                    <td className="px-4 py-3 text-white text-sm font-medium">{c.client.name}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{c.service.name}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{c.professional.name}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{fmtHora(c.scheduledAt)}</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">{fmtMoeda(c.payment?.amount ?? c.service.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${st.cor}`}>{st.label}</span>
                      {c.payment && (
                        <span className="text-zinc-600 text-xs ml-2 font-mono">{c.payment.method}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <PagamentoModal
        dados={dadosPagamento}
        onFechar={() => setDadosPagamento(null)}
        onConfirmado={fetchDados}
      />

      {/* ── Pendências — só visível no filtro "A cobrar" ───────── */}
      {filtro === "A_COBRAR" && pendentes.length > 0 && (() => {
        const vencidos = pendentes.filter(p => p.status === "OVERDUE")
        const aVencer = pendentes.filter(p => p.status === "PENDING")
        const totalPend = pendentes.reduce((s, p) => s + p.amount, 0)
        const totalVenc = vencidos.reduce((s, p) => s + p.amount, 0)
        const totalAVenc = aVencer.reduce((s, p) => s + p.amount, 0)
        return (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-white font-semibold text-sm">Pendências de pagamento</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">{pendentes.length}</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-zinc-500 text-xs mb-1">Total pendente</div>
                <div className="text-amber-400 font-bold text-lg font-mono">{fmtMoeda(totalPend)}</div>
                <div className="text-zinc-600 text-xs">{pendentes.length} cobrança{pendentes.length !== 1 ? "s" : ""}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-zinc-500 text-xs mb-1">Vencido</div>
                <div className="text-red-400 font-bold text-lg font-mono">{fmtMoeda(totalVenc)}</div>
                <div className="text-zinc-600 text-xs">{vencidos.length} cobrança{vencidos.length !== 1 ? "s" : ""}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-zinc-500 text-xs mb-1">A vencer</div>
                <div className="text-green-400 font-bold text-lg font-mono">{fmtMoeda(totalAVenc)}</div>
                <div className="text-zinc-600 text-xs">{aVencer.length} cobrança{aVencer.length !== 1 ? "s" : ""}</div>
              </div>
            </div>

            {/* Lista */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                    <th className="px-4 py-2.5 text-left font-medium">Serviço</th>
                    <th className="px-4 py-2.5 text-left font-medium">Profissional</th>
                    <th className="px-4 py-2.5 text-left font-medium">Agendado</th>
                    <th className="px-4 py-2.5 text-left font-medium">Vencimento</th>
                    <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {pendentes.map(p => {
                    const isVenc = p.status === "OVERDUE"
                    return (
                      <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{p.client.name}</div>
                          <div className="text-zinc-500 text-xs">{p.client.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{p.service.name}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{p.professional.name}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs font-mono">
                          {new Date(p.scheduledAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {p.dueDate
                            ? <span className={isVenc ? "text-red-400" : "text-zinc-400"}>{new Date(p.dueDate).toLocaleDateString("pt-BR")}</span>
                            : <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">{fmtMoeda(p.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${isVenc ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                            {isVenc ? "Vencido" : "Pendente"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setPendenciaSelecionada(p)}
                            className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Marcar pago
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      <PagamentoModal
        ocultarPayLater
        dados={pendenciaSelecionada ? {
          appointmentId: pendenciaSelecionada.id,
          clientName: pendenciaSelecionada.client.name,
          serviceName: pendenciaSelecionada.service.name,
          professionalName: pendenciaSelecionada.professional.name,
          amount: pendenciaSelecionada.amount,
        } : null}
        endpointOverride="/api/financeiro"
        bodyExtra={{ action: "marcar-pago", paymentId: pendenciaSelecionada?.id }}
        onFechar={() => setPendenciaSelecionada(null)}
        onConfirmado={fetchDados}
      />

      {/* Modal — PIX avulso */}
      {modalGerar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">Gerar PIX avulso</h2>
              <button onClick={() => setModalGerar(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={gerarAvulso} className="p-5 space-y-4">
              <div className="bg-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-zinc-500 text-xs">Chave PIX:</span>
                <span className="text-white text-xs font-mono">{config?.pixKey}</span>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Descrição</label>
                <input value={descGerar} onChange={e => setDescGerar(e.target.value)}
                  placeholder="Ex: Corte + Barba — Felipe"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Valor (R$) *</label>
                <input value={valorGerar} onChange={e => setValorGerar(e.target.value)} required inputMode="decimal"
                  placeholder="0,00"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 placeholder:text-zinc-600" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalGerar(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm">Cancelar</button>
                <button type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm">Gerar código</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — exibir PIX avulso gerado */}
      {pixAvulso && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold">PIX gerado</h2>
              <button onClick={() => setPixAvulso(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 text-center space-y-4">
              {pixAvulso.desc && <div className="text-zinc-400 text-sm">{pixAvulso.desc}</div>}
              <div className="text-green-400 text-3xl font-bold">{fmtMoeda(pixAvulso.valor)}</div>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixAvulso.payload)}`}
                    alt="QR PIX" width={180} height={180} data-no-invert />
                </div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 text-left">
                <div className="text-zinc-500 text-xs mb-1 font-mono uppercase tracking-wider">Copia e Cola</div>
                <div className="text-zinc-300 text-xs font-mono break-all select-all leading-relaxed">{pixAvulso.payload}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copiar(pixAvulso.payload)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${copiado ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"}`}>
                  {copiado ? "✓ Copiado!" : "Copiar código"}
                </button>
                {config?.whatsapp && (
                  <a href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Segue o código PIX:\n\n${pixAvulso.payload}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center bg-green-500/15 hover:bg-green-500/25 text-green-400 font-medium py-2.5 rounded-lg text-sm border border-green-500/20 transition-colors">
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}
