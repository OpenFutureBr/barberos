"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/DashboardLayout"
import PageSkeleton from "@/components/PageSkeleton"

const metodos = [
  { id: "PIX", label: "PIX", icon: "📱" },
  { id: "CASH", label: "Dinheiro", icon: "💵" },
  { id: "CARD_CREDITO", label: "Crédito", icon: "💳" },
  { id: "CARD_DEBITO", label: "Débito", icon: "💳" },
  { id: "PAY_LATER", label: "Pagar depois", icon: "🕓" },
]

type ComandaItem = {
  produto: any
  qty: number
}

function hojeInputDate() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function normalizarMetodoParaApi(metodo: string) {
  if (metodo === "CARD_CREDITO" || metodo === "CARD_DEBITO") return "CARD"
  return metodo
}

export default function ComandaPage() {
  const { apptId } = useParams<{ apptId: string }>()
  const router = useRouter()

  const [appt, setAppt] = useState<any | null>(null)
  const [itens, setItens] = useState<ComandaItem[]>([])
  const [loading, setLoading] = useState(true)

  const [pagamento, setPagamento] = useState("PIX")
  const [dueDate, setDueDate] = useState("")
  const [erro, setErro] = useState("")
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    // Carrega agendamento da API
    fetch(`/api/agenda/comanda/${apptId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.appt) setAppt(d.appt)
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Carrega itens da comanda do sessionStorage
    try {
      const saved = sessionStorage.getItem("barberos_comandas")
      if (saved) {
        const todas = JSON.parse(saved)
        setItens(todas[apptId] ?? [])
      }
    } catch {}
  }, [apptId])

  async function confirmarPagamento() {
    if (!appt) return

    setErro("")

    const isPagarDepois = pagamento === "PAY_LATER"

    if (isPagarDepois && !dueDate) {
      setErro("Informe a data de vencimento para registrar o pagamento pendente.")
      return
    }

    setConfirmando(true)

    try {
      const cliente = appt.client?.name || "Cliente"

      // 1. Baixa estoque de cada produto
      for (const item of itens) {
        const res = await fetch("/api/estoque/movimentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.produto.id,
            type: "SAIDA",
            quantity: item.qty,
            reason: `Comanda — ${cliente}`,
            unitPrice: item.produto.salePrice,
            appointmentId: apptId,
          }),
        })

        if (!res.ok) {
          const d = await res.json().catch(() => null)
          setErro(d?.error || "Erro ao baixar estoque.")
          return
        }
      }

      // 2. Finaliza agendamento e registra pagamento
      const resPagamento = await fetch(`/api/agenda/comanda/${apptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: normalizarMetodoParaApi(pagamento),
          amount: total,
          dueDate: isPagarDepois ? dueDate : null,
        }),
      })

      if (!resPagamento.ok) {
        const d = await resPagamento.json().catch(() => null)
        setErro(d?.error || "Erro ao registrar pagamento.")
        return
      }

      // 3. Limpa comanda do sessionStorage
      try {
        const saved = sessionStorage.getItem("barberos_comandas")
        if (saved) {
          const todas = JSON.parse(saved)
          delete todas[apptId]
          sessionStorage.setItem("barberos_comandas", JSON.stringify(todas))
        }
      } catch {}

      window.dispatchEvent(
        new CustomEvent(isPagarDepois ? "pagamentoPendente" : "pagamentoConfirmado"),
      )

      window.dispatchEvent(new CustomEvent("vendaRegistrada"))

      router.push("/dashboard/agenda")
    } catch (e) {
      console.error(e)
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setConfirmando(false)
    }
  }

  if (loading) return <DashboardLayout><PageSkeleton rows={5} cards={3} /></DashboardLayout>

  if (!appt) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-zinc-500">Agendamento não encontrado</div>
      </DashboardLayout>
    )
  }

  const precoCorte = Number(appt.service?.price ?? 0)
  const totalProdutos = itens.reduce(
    (s, i) => s + i.qty * Number(i.produto.salePrice ?? 0),
    0,
  )
  const total = precoCorte + totalProdutos
  const isPagarDepois = pagamento === "PAY_LATER"

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="text-zinc-500 hover:text-white transition-colors text-lg"
          >
            ←
          </button>

          <h1 className="text-white text-xl font-bold">Finalizar Cobrança</h1>
        </div>

        {/* Cliente */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-white font-bold text-xl mb-1">{appt.client?.name}</div>

          <div className="text-zinc-400 text-sm">{appt.service?.name}</div>

          <div className="text-zinc-500 text-xs mt-1">
            {appt.professional?.name} ·{" "}
            {new Date(appt.scheduledAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {new Date(appt.scheduledAt).toLocaleDateString("pt-BR")}
          </div>
        </div>

        {/* Comanda */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <span className="text-zinc-400 text-xs uppercase tracking-wider font-mono">
              Comanda
            </span>
          </div>

          <div className="flex justify-between items-center px-5 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span>✂️</span>
              <span className="text-white text-sm">{appt.service?.name}</span>
            </div>

            <span className="text-white font-medium font-mono">
              R$ {precoCorte.toFixed(2)}
            </span>
          </div>

          {itens.length === 0 && (
            <div className="px-5 py-3 text-zinc-600 text-sm italic border-b border-zinc-800">
              Nenhum produto adicionado
            </div>
          )}

          {itens.map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-5 py-3 border-b border-zinc-800 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span>📦</span>

                <div>
                  <div className="text-white text-sm">{item.produto.name}</div>

                  <div className="text-zinc-500 text-xs">
                    {item.qty}× R$ {Number(item.produto.salePrice ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <span className="text-white font-medium font-mono">
                R$ {(item.qty * Number(item.produto.salePrice ?? 0)).toFixed(2)}
              </span>
            </div>
          ))}

          <div className="flex justify-between items-center px-5 py-4 bg-zinc-800/50">
            <span className="text-white font-bold text-lg">Total</span>

            <span className="text-amber-400 font-bold text-2xl">
              R$ {total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Pagamento */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-zinc-400 text-xs uppercase tracking-wider mb-3 font-mono">
            Forma de pagamento
          </div>

          <div className="grid grid-cols-5 gap-2">
            {metodos.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setPagamento(m.id)
                  setErro("")
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  pagamento === m.id
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="text-xl">{m.icon}</span>
                <span className="text-xs font-medium leading-tight text-center">
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          {isPagarDepois && (
            <div className="mt-4 bg-zinc-800/70 border border-zinc-700 rounded-xl p-4 space-y-2">
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

              <p className="text-zinc-500 text-xs leading-relaxed">
                O atendimento será concluído agora, mas o valor ficará pendente no
                financeiro até ser marcado como pago.
              </p>
            </div>
          )}
        </div>

        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {erro}
          </div>
        )}

        <button
          onClick={confirmarPagamento}
          disabled={confirmando}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {confirmando
            ? "Confirmando..."
            : isPagarDepois
              ? `Registrar pendência · R$ ${total.toFixed(2)}`
              : `Confirmar · R$ ${total.toFixed(2)}`}
        </button>
      </div>
    </DashboardLayout>
  )
}