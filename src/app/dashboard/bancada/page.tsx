"use client"

import { useEffect, useState, useMemo } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"

type Barbeiro = { id: string; name: string; profilePhoto?: string | null }
type Produto = { id: string; name: string; category: string; stock: number; unit?: string | null }
type Movimento = {
  id: string
  productId: string
  type: string
  quantity: number
  reason: string | null
  createdAt: string
  product: { name: string; category: string }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

export default function BancadaPage() {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [carregando, setCarregando] = useState(true)

  // Formulário de transferência
  const [barbeiroId, setBarbeiroId] = useState("")
  const [produtoId, setProdutoId] = useState("")
  const [quantidade, setQuantidade] = useState("1")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState("")

  // Aba selecionada para histórico
  const [abaHistorico, setAbaHistorico] = useState("")

  async function carregar() {
    setCarregando(true)
    try {
      const [eqRes, estRes, movRes] = await Promise.all([
        fetch("/api/equipe"),
        fetch("/api/estoque"),
        fetch("/api/estoque/movimentos"),
      ])
      const eq = await eqRes.json()
      const est = await estRes.json()
      const mov = await movRes.json()

      setBarbeiros(Array.isArray(eq) ? eq : [])
      setProdutos(Array.isArray(est) ? est.filter((p: any) => p.stock > 0 || true) : [])
      setMovimentos(Array.isArray(mov) ? mov.filter((m: Movimento) => m.reason?.startsWith("Bancada -")) : [])
    } catch {
      setErro("Erro ao carregar dados.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  // Saldo por barbeiro por produto (soma entradas via bancada — saída do estoque)
  const saldoPorBarbeiro = useMemo(() => {
    const mapa: Record<string, Record<string, number>> = {}
    for (const m of movimentos) {
      const nome = m.reason?.replace("Bancada - ", "") ?? ""
      if (!mapa[nome]) mapa[nome] = {}
      mapa[nome][m.productId] = (mapa[nome][m.productId] ?? 0) + m.quantity
    }
    return mapa
  }, [movimentos])

  async function transferir(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setSucesso("")
    const barb = barbeiros.find(b => b.id === barbeiroId)
    if (!barb) return setErro("Selecione um barbeiro.")
    const prod = produtos.find(p => p.id === produtoId)
    if (!prod) return setErro("Selecione um produto.")
    const qty = parseInt(quantidade, 10)
    if (!qty || qty <= 0) return setErro("Quantidade inválida.")
    if (prod.stock < qty) return setErro(`Estoque insuficiente. Disponível: ${prod.stock}`)

    setSalvando(true)
    try {
      const res = await fetch("/api/estoque/movimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: produtoId,
          type: "SAIDA",
          quantity: qty,
          reason: `Bancada - ${barb.name}`,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        return setErro(d.error || "Erro ao transferir.")
      }
      setSucesso(`${qty}× ${prod.name} transferido(s) para bancada de ${barb.name}.`)
      setProdutoId("")
      setQuantidade("1")
      await carregar()
    } catch {
      setErro("Erro de rede.")
    } finally {
      setSalvando(false)
    }
  }

  const barbeiroAtivo = barbeiros.find(b => b.id === abaHistorico) ?? barbeiros[0]
  const nomeAtivo = barbeiroAtivo?.name ?? ""
  const itensAtivo = Object.entries(saldoPorBarbeiro[nomeAtivo] ?? {}).map(([pid, qty]) => {
    const p = produtos.find(pr => pr.id === pid)
    return { pid, nome: p?.name ?? pid, qty }
  })
  const historicoAtivo = movimentos.filter(m => m.reason === `Bancada - ${nomeAtivo}`)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-white text-xl font-bold">Controle de Bancada</h1>
          <p className="text-zinc-500 text-sm">Materiais disponibilizados pela barbearia para cada barbeiro</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de transferência */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-white font-semibold text-sm mb-4">Transferir para bancada</p>
              <form onSubmit={transferir} className="space-y-3">
                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Barbeiro</label>
                  <select
                    value={barbeiroId}
                    onChange={e => setBarbeiroId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
                    <option value="">Selecione…</option>
                    {barbeiros.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Produto</label>
                  <select
                    value={produtoId}
                    onChange={e => setProdutoId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
                    <option value="">Selecione…</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.stock} em estoque)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Quantidade</label>
                  <input
                    type="number" min="1"
                    value={quantidade}
                    onChange={e => setQuantidade(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                    inputMode="numeric" />
                </div>

                {erro && <p className="text-red-400 text-xs">{erro}</p>}
                {sucesso && <p className="text-green-400 text-xs">{sucesso}</p>}

                <button
                  type="submit" disabled={salvando}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  {salvando ? "Transferindo…" : "Transferir"}
                </button>
              </form>
            </div>
          </div>

          {/* Saldo e histórico por barbeiro */}
          <div className="lg:col-span-2">
            {carregando ? (
              <div className="text-zinc-500 text-sm p-6">Carregando…</div>
            ) : barbeiros.length === 0 ? (
              <div className="text-zinc-500 text-sm p-6">Nenhum barbeiro cadastrado.</div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Abas por barbeiro */}
                <div className="flex overflow-x-auto border-b border-zinc-800">
                  {barbeiros.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setAbaHistorico(b.id)}
                      className={`px-4 py-3 text-sm font-medium flex-shrink-0 transition-colors border-b-2 ${
                        (abaHistorico || barbeiros[0]?.id) === b.id
                          ? "text-amber-400 border-amber-400"
                          : "text-zinc-500 border-transparent hover:text-zinc-300"
                      }`}>
                      {b.name}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* Saldo atual */}
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Saldo em bancada</p>
                  {itensAtivo.length === 0 ? (
                    <p className="text-zinc-600 text-sm mb-4">Nenhum item transferido ainda.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {itensAtivo.map(item => (
                        <div key={item.pid} className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                          <span className="text-zinc-300 text-sm">{item.nome}</span>
                          <span className="text-amber-400 font-bold text-sm">{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Histórico */}
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Histórico de transferências</p>
                  {historicoAtivo.length === 0 ? (
                    <p className="text-zinc-600 text-sm">Nenhuma transferência registrada.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {historicoAtivo.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-2.5">
                          <div>
                            <span className="text-zinc-200 text-sm">{m.product.name}</span>
                            <span className="text-zinc-500 text-xs ml-2">{fmtDate(m.createdAt)}</span>
                          </div>
                          <span className="text-amber-400 font-semibold text-sm">−{m.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
