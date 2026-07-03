"use client"

import { useState, useEffect } from "react"
import { getCache, setCache } from "@/lib/prefetch-cache"

// ── PIX payload (EMV / BACEN) ──────────────────────────────────────────────

function crc16(str: string): string {
  let crc = 0xffff

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8

    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0")
}

function emv(id: string, v: string) {
  return `${id}${String(v.length).padStart(2, "0")}${v}`
}

function san(s: string, n: number) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .slice(0, n)
    .toUpperCase()
}

function gerarPix(chave: string, nome: string, cidade: string, valor: number): string {
  const merchant = emv("26", emv("00", "BR.GOV.BCB.PIX") + emv("01", chave))
  const add = emv("62", emv("05", "***"))

  const body =
    emv("00", "01") +
    merchant +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", valor.toFixed(2)) +
    emv("58", "BR") +
    emv("59", san(nome, 25) || "BARBEROS") +
    emv("60", san(cidade, 15) || "BRASIL") +
    add +
    "6304"

  return body + crc16(body)
}

// ── Tipos ──────────────────────────────────────────────────────────────────

export type ComandaItem = {
  productId: string
  nome: string
  qty: number
  unitPrice: number
}

export type DadosPagamento = {
  appointmentId: string
  clientName: string
  serviceName: string
  professionalName?: string
  scheduledAt?: string
  amount: number
  comandaItens?: ComandaItem[]
  clientId?: string // usado em vendas sem agendamento
}

type MetodoPag = "PIX" | "CASH" | "CARD_CREDITO" | "CARD_DEBITO" | "PAY_LATER"

const METODOS: { key: MetodoPag; label: string; icon: string }[] = [
  { key: "PIX", label: "PIX", icon: "◈" },
  { key: "CASH", label: "Dinheiro", icon: "◉" },
  { key: "CARD_CREDITO", label: "Crédito", icon: "▣" },
  { key: "CARD_DEBITO", label: "Débito", icon: "▢" },
  { key: "PAY_LATER", label: "Pagar depois", icon: "◷" },
]

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")

  return `${ano}-${mes}-${dia}`
}

// ── Componente ─────────────────────────────────────────────────────────────

type Props = {
  dados: DadosPagamento | null
  onFechar: () => void
  onConfirmado?: (appointmentId: string) => void
  endpointOverride?: string
  bodyExtra?: Record<string, unknown>
  ocultarPayLater?: boolean
}

export default function PagamentoModal({
  dados,
  onFechar,
  onConfirmado,
  endpointOverride,
  bodyExtra,
  ocultarPayLater = false,
}: Props) {
  const [metodo, setMetodo] = useState<MetodoPag>("PIX")
  const [dueDate, setDueDate] = useState("")
  const [erro, setErro] = useState("")
  const [confirmando, setConfirmando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [recibo, setRecibo] = useState<{ clientName: string; serviceName: string; professionalName?: string; scheduledAt?: string; amount: number; metodoLabel: string; hora: string } | null>(null)
  const [config, setConfig] = useState<{
    pixKey: string | null
    name: string
    city: string | null
  } | null>(null)

  useEffect(() => {
    if (!dados) return

    setMetodo("PIX")
    setDueDate("")
    setErro("")
    setCopiado(false)
    setRecibo(null)

    const aplicar = (d: any) =>
      setConfig({
        pixKey: d.pixKey ?? null,
        name: d.name ?? "",
        city: d.city ?? null,
      })

    const cfgCache = getCache("configuracoes")
    if (cfgCache) {
      aplicar(cfgCache)
    } else {
      fetch("/api/configuracoes")
        .then((r) => r.json())
        .then((d) => { if (!d.error) setCache("configuracoes", d); aplicar(d) })
        .catch(() => {})
    }
  }, [dados])

  if (!dados) return null

  // Recibo pós-pagamento
  if (recibo) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
          <div className="p-6 text-center border-b border-zinc-800">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <h2 className="text-white font-bold text-lg">Pagamento confirmado</h2>
            <p className="text-zinc-500 text-xs mt-1">{recibo.hora}</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="bg-zinc-800 rounded-xl p-4 space-y-2.5">
              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Recibo</div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Cliente</span>
                <span className="text-white text-sm font-medium">{recibo.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Serviço</span>
                <span className="text-white text-sm">{recibo.serviceName}</span>
              </div>
              {recibo.professionalName && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-sm">Profissional</span>
                  <span className="text-white text-sm">{recibo.professionalName}</span>
                </div>
              )}
              {recibo.scheduledAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-sm">Data</span>
                  <span className="text-white text-sm">
                    {new Date(recibo.scheduledAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Forma de pagamento</span>
                <span className="text-white text-sm">{recibo.metodoLabel}</span>
              </div>
              <div className="border-t border-zinc-700 pt-2.5 flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-green-400 font-bold text-lg">{fmtMoeda(recibo.amount)}</span>
              </div>
            </div>
            <p className="text-zinc-600 text-xs text-center">Futuramente disponível: emissão de NFS-e</p>
            <div className="flex gap-2 pt-1">
              <button type="button"
                onClick={() => window.print()}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-lg text-sm border border-zinc-700 transition-colors">
                Imprimir
              </button>
              <button type="button"
                onClick={onFechar}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const d = dados

  const isPagarDepois = metodo === "PAY_LATER"

  const pixPayload =
    metodo === "PIX" && config?.pixKey
      ? gerarPix(config.pixKey, config.name, config.city ?? "", d.amount)
      : null

  async function baixarEstoqueComanda() {
    if (!d.comandaItens || d.comandaItens.length === 0) return

    await Promise.all(
      d.comandaItens.map(async (item) => {
        const res = await fetch("/api/estoque/movimentos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: item.productId,
            type: "SAIDA",
            quantity: item.qty,
            unitPrice: item.unitPrice,
            appointmentId: d.appointmentId,
            reason: `Comanda - ${d.clientName}`,
          }),
        })

        if (!res.ok) {
          const resposta = await res.json().catch(() => null)
          throw new Error(resposta?.error || "Erro ao baixar estoque da comanda.")
        }
      }),
    )
  }

  async function confirmar() {
    setErro("")

    if (isPagarDepois && !dueDate) {
      setErro("Informe a data de vencimento para registrar o pagamento pendente.")
      return
    }

    setConfirmando(true)

    try {
      const method =
        metodo === "CARD_CREDITO" || metodo === "CARD_DEBITO" ? "CARD" : metodo

      const endpoint = endpointOverride ?? "/api/pix/pagar"

      const body = endpointOverride
        ? {
            method,
            amount: d.amount,
            clientId: d.clientId,
            items: d.comandaItens,
            dueDate: isPagarDepois ? dueDate : null,
            ...bodyExtra,
          }
        : {
            appointmentId: d.appointmentId,
            method,
            amount: d.amount,
            dueDate: isPagarDepois ? dueDate : null,
          }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const resposta = await res.json().catch(() => null)
        throw new Error(resposta?.error || "Erro ao registrar pagamento.")
      }

      /**
       * Baixa estoque somente depois que o pagamento/venda foi aceito pela API.
       * Isso evita baixar produto se o pagamento falhar.
       */
      await baixarEstoqueComanda()

      window.dispatchEvent(
        new CustomEvent(isPagarDepois ? "pagamentoPendente" : "pagamentoConfirmado"),
      )

      if (!isPagarDepois) {
        const metodoLabel = METODOS.find(m => m.key === metodo)?.label ?? metodo
        setRecibo({
          clientName: d.clientName,
          serviceName: d.serviceName,
          professionalName: d.professionalName,
          scheduledAt: d.scheduledAt,
          amount: d.amount,
          metodoLabel,
          hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        })
        onConfirmado?.(d.appointmentId)
      } else {
        onFechar()
        onConfirmado?.(d.appointmentId)
      }
    } catch (e) {
      console.error(e)
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setConfirmando(false)
    }
  }

  function copiar(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  const hora = d.scheduledAt
    ? new Date(d.scheduledAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-bold">Registrar pagamento</h2>

          <button
            onClick={onFechar}
            className="text-zinc-500 hover:text-white text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info do agendamento + valor */}
          <div className="bg-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-white font-semibold truncate">{d.clientName}</div>
              <div className="text-zinc-400 text-sm truncate">{d.serviceName}</div>

              {(d.professionalName || hora) && (
                <div className="text-zinc-500 text-xs">
                  {[d.professionalName, hora].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            <div className="text-green-400 text-2xl font-bold flex-shrink-0">
              {fmtMoeda(d.amount)}
            </div>
          </div>

          {/* Método de pagamento */}
          <div>
            <div className="text-zinc-400 text-xs mb-2">Forma de pagamento</div>

            <div className="grid grid-cols-5 gap-1.5">
              {METODOS.filter(m => !(ocultarPayLater && m.key === "PAY_LATER")).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMetodo(m.key)
                    setErro("")
                  }}
                  className={`py-2.5 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-colors border ${
                    metodo === m.key
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span className="leading-tight text-center">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data de vencimento para pagar depois */}
          {isPagarDepois && (
            <div className="bg-zinc-800/70 border border-zinc-700 rounded-lg p-3 space-y-2">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  Data de vencimento *
                </label>

                <input
                  type="date"
                  value={dueDate}
                  min={hojeInputDate()}
                  onChange={(e) => {
                    setDueDate(e.target.value)
                    setErro("")
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="text-zinc-500 text-xs leading-relaxed">
                O atendimento será finalizado, mas o valor ficará como pendente no
                financeiro até ser marcado como pago.
              </div>
            </div>
          )}

          {/* QR PIX */}
          {metodo === "PIX" && (
            <div className="space-y-3">
              {pixPayload ? (
                <>
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-xl inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          pixPayload,
                        )}`}
                        alt="QR PIX"
                        width={160}
                        height={160}
                        data-no-invert
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copiar(pixPayload)}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${
                      copiado
                        ? "bg-green-500/20 border-green-500/30 text-green-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {copiado ? "✓ Copiado!" : "Copiar código PIX"}
                  </button>
                </>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400 text-xs">
                  Chave PIX não configurada. Acesse Configurações.
                </div>
              )}
            </div>
          )}

          {erro && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">
              {erro}
            </div>
          )}

          {/* Confirmar */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={confirmar}
              disabled={confirmando}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              {confirmando
                ? "Registrando..."
                : isPagarDepois
                  ? "Registrar pendência"
                  : "Confirmar pagamento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}