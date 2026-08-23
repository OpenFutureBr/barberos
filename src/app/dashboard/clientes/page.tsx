"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { getCache, setCache, invalidateCache } from "@/lib/prefetch-cache"

function tempoComoCliente(createdAt: string): string {
  const dias = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
  if (dias < 1) return "hoje"
  if (dias < 30) return `${dias}d`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `${meses}m`
  const anos = Math.floor(dias / 365)
  const mesesResto = Math.floor((dias % 365) / 30)
  return mesesResto > 0 ? `${anos}a ${mesesResto}m` : `${anos}a`
}

const segmentoStyle: Record<string, string> = {
  VIP:      "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  INACTIVE: "bg-purple-500/10 text-purple-400 border border-purple-500/20", // Fiel
  AT_RISK:  "bg-blue-500/10 text-blue-400 border border-blue-500/20",       // Frequente
  REGULAR:  "bg-green-500/10 text-green-400 border border-green-500/20",
  NEW:      "bg-zinc-700 text-zinc-400 border border-zinc-600",
}

const segmentoLabel: Record<string, string> = {
  VIP:      "VIP",
  INACTIVE: "Fiel",       // 20+ cortes
  AT_RISK:  "Frequente",  // 10-19 cortes
  REGULAR:  "Regular",    // 3-9 cortes
  NEW:      "Novo",       // 0-2 cortes
}

const paises = [
  { codigo: "+55", sigla: "BR", mascara: "(XX) XXXXX-XXXX", digitos: 11 },
  { codigo: "+1",  sigla: "US", mascara: "(XXX) XXX-XXXX",  digitos: 10 },
  { codigo: "+351",sigla: "PT", mascara: "XXX XXX XXX",     digitos: 9  },
  { codigo: "+54", sigla: "AR", mascara: "(XX) XXXX-XXXX",  digitos: 10 },
  { codigo: "+598",sigla: "UY", mascara: "XXXX XXXX",       digitos: 8  },
]

function formatarTelefone(valor: string, digitos: number): string {
  const nums = valor.replace(/\D/g, "").slice(0, digitos)
  if (digitos === 11) {
    if (nums.length <= 2) return nums.length ? `(${nums}` : ""
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`
    return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`
  }
  if (digitos === 10) {
    if (nums.length <= 3) return nums.length ? `(${nums}` : ""
    if (nums.length <= 6) return `(${nums.slice(0,3)}) ${nums.slice(3)}`
    return `(${nums.slice(0,3)}) ${nums.slice(3,6)}-${nums.slice(6)}`
  }
  return nums
}

export default function ClientesPage() {
  const router = useRouter()

  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [buscaInput, setBuscaInput] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(30)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [paisIdx, setPaisIdx] = useState(0)
  const [email, setEmail] = useState("")
  const [nascimento, setNascimento] = useState("")
  const [cep, setCep] = useState("")
  const [rua, setRua] = useState("")
  const [numero, setNumero] = useState("")
  const [bairro, setBairro] = useState("")
  const [cidade, setCidade] = useState("")
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [telefoneExiste, setTelefoneExiste] = useState(false)

  const pais = paises[paisIdx]

  useEffect(() => { buscarClientes() }, [page, perPage, busca])

  async function buscarClientes() {
    const cacheKey = `clientes:${page}:${perPage}:${busca}`

    // Stale-while-revalidate: mostra cache imediatamente se existir
    const cached = getCache(cacheKey)
    if (cached) {
      setClientes(cached.clientes ?? [])
      setTotal(cached.total ?? 0)
      setTotalPages(cached.totalPages ?? 1)
      setLoading(false)
      // Atualiza em background silenciosamente
      fetch(`/api/clientes?page=${page}&perPage=${perPage}${busca ? `&busca=${busca}` : ""}`)
        .then(r => r.json())
        .then(d => { if (!d.error) { setCache(cacheKey, d); setClientes(d.clientes ?? []); setTotal(d.total ?? 0) } })
        .catch(() => {})
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
      if (busca) params.set("busca", busca)
      const res = await fetch(`/api/clientes?${params}`)
      const data = await res.json()
      if (!data.error) setCache(cacheKey, data)
      setClientes(Array.isArray(data.clientes) ? data.clientes : [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch {
      setErro("Erro ao carregar clientes")
    } finally {
      setLoading(false)
    }
  }

  function handleTelefone(valor: string) {
    const formatado = formatarTelefone(valor, pais.digitos)
    setTelefone(formatado)
    const nums = formatado.replace(/\D/g, "")
    if (nums.length === pais.digitos) {
      const telefoneCompleto = pais.codigo + nums
      const existe = clientes.some(c =>
        c.phone?.replace(/\D/g, "") === nums ||
        c.phone === telefoneCompleto ||
        c.phone?.replace(/\D/g, "") === telefoneCompleto.replace(/\D/g, "")
      )
      setTelefoneExiste(existe)
    } else {
      setTelefoneExiste(false)
    }
  }

  async function buscarCep(valor: string) {
    const nums = valor.replace(/\D/g, "")
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setRua(data.logradouro || "")
        setBairro(data.bairro || "")
        setCidade(data.localidade || "")
      }
    } catch {
      // ignora erro de CEP
    } finally {
      setBuscandoCep(false)
    }
  }

  function handleCep(valor: string) {
    const nums = valor.replace(/\D/g, "").slice(0, 8)
    const fmt = nums.length > 5 ? `${nums.slice(0,5)}-${nums.slice(5)}` : nums
    setCep(fmt)
    if (nums.length === 8) buscarCep(nums)
  }

  function fecharModal() {
    setModalAberto(false)
    setNome(""); setTelefone(""); setEmail(""); setNascimento("")
    setCep(""); setRua(""); setNumero(""); setBairro(""); setCidade("")
    setErro(""); setTelefoneExiste(false); setPaisIdx(0)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (telefoneExiste) { setErro("Este telefone já está cadastrado."); return }
    const nums = telefone.replace(/\D/g, "")
    if (nums.length !== pais.digitos) { setErro(`Telefone deve ter ${pais.digitos} dígitos.`); return }
    setSalvando(true)
    setErro("")
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome,
          phone: pais.codigo + nums,
          email: email || null,
          birthDate: nascimento || null,
          homeZipCode: cep.replace(/\D/g, "") || null,
          homeAddress: rua || null,
          homeNumber: numero || null,
          homeNeighborhood: bairro || null,
          homeCity: cidade || null,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setErro(result.error || "Erro ao salvar cliente.")
        return
      }
      invalidateCache("clientes:")
      await buscarClientes()
      fecharModal()
    } catch {
      setErro("Erro inesperado. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  // Busca com debounce (600ms)
  useEffect(() => {
    const t = setTimeout(() => { setBusca(buscaInput); setPage(1) }, 600)
    return () => clearTimeout(t)
  }, [buscaInput])

  return (
    <DashboardLayout>

      <div className="flex items-center justify-between mb-4">
        <div className="hidden md:block">
          <h1 className="text-white text-xl font-bold">Clientes</h1>
          <p className="text-zinc-500 text-sm">{total} cadastrados</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-auto md:ml-0">
          <button
            onClick={() => setModalAberto(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm transition-colors"
          >
            + Novo cliente
          </button>
          <p className="text-zinc-500 text-xs md:hidden">{total} cadastrados</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 mb-4">
        <input
          value={buscaInput}
          onChange={(e) => setBuscaInput(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="flex-1 min-w-0 max-w-[55%] md:max-w-none bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
        />
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex-shrink-0">
          {[10, 30, 50].map(n => (
            <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
              className={`px-2 md:px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${perPage === n ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Carregando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-zinc-600 text-sm mb-2">
              {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
            </div>
            {!busca && (
              <button onClick={() => setModalAberto(true)} className="text-amber-400 text-sm hover:text-amber-300 transition-colors">
                Cadastrar primeiro cliente →
              </button>
            )}
          </div>
        ) : (
          <>
          {/* Lista mobile — só nome, telefone e ícone */}
          <div className="md:hidden divide-y divide-zinc-800">
            {clientes.map(cliente => (
              <div
                key={cliente.id}
                onClick={() => router.push(`/dashboard/clientes/${cliente.id}`)}
                className="flex items-center gap-3 px-4 py-3 active:bg-zinc-800/50 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {cliente.name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium truncate">{cliente.name}</div>
                  <div className="text-zinc-500 text-xs truncate">{cliente.phone}</div>
                </div>
              </div>
            ))}
          </div>

          <table className="hidden md:table w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Cliente</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Telefone</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Email</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Corte preferido</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Produto preferido</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Cliente há</th>
                <th className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest font-mono">Status</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente, i) => (
                <tr
                  key={cliente.id}
                  onClick={() => router.push(`/dashboard/clientes/${cliente.id}`)}
                  className={`border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer ${i === clientes.length - 1 ? "border-0" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {cliente.name?.charAt(0)}
                      </div>
                      <span className="text-white text-sm font-medium">{cliente.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{cliente.phone}</td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">{cliente.email || "—"}</td>
                  <td className="px-4 py-3 text-zinc-300 text-sm">
                    {cliente.favoritoCorte ?? <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-sm">
                    {cliente.favoritoProduto ?? <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm font-mono">
                    {tempoComoCliente(cliente.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${segmentoStyle[cliente.segment] ?? segmentoStyle.NEW}`}>
                      {segmentoLabel[cliente.segment] ?? "Novo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-zinc-500 text-sm">
            Exibindo {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} de {total}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white disabled:opacity-30 hover:bg-zinc-800 transition-colors">
              «
            </button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white disabled:opacity-30 hover:bg-zinc-800 transition-colors">
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white disabled:opacity-30 hover:bg-zinc-800 transition-colors">
              ›
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white disabled:opacity-30 hover:bg-zinc-800 transition-colors">
              »
            </button>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-white font-bold">Novo Cliente</h2>
              <button onClick={fecharModal} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-3">

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Nome completo *</label>
                <input value={nome} onChange={(e) => {
                  const formatado = e.target.value
                    .toLowerCase()
                    .replace(/(^|\s)\S/g, l => l.toUpperCase())
                  setNome(formatado)
                }} required
                  placeholder="Ex: João Silva"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Telefone *</label>
                <div className="flex gap-2">
                  <select
                    value={paisIdx}
                    onChange={(e) => { setPaisIdx(Number(e.target.value)); setTelefone(""); setTelefoneExiste(false) }}
                    className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
                  >
                    {paises.map((p, i) => (
                      <option key={i} value={i}>{p.sigla} {p.codigo}</option>
                    ))}
                  </select>
                  <input
                    value={telefone}
                    onChange={(e) => handleTelefone(e.target.value)}
                    required
                    placeholder={pais.mascara.replace(/X/g, "9")}
                    className={`flex-1 bg-zinc-800 border text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-600 ${
                      telefoneExiste ? "border-red-500 focus:border-red-500" : "border-zinc-700 focus:border-amber-500"
                    }`}
                  />
                </div>
                {telefoneExiste && (
                  <p className="text-red-400 text-xs mt-1">Este telefone já está cadastrado.</p>
                )}
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com" type="email"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">Data de nascimento</label>
                <input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors" />
              </div>

              <div className="pt-1">
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest border-t border-zinc-800 pt-3">Endereço para domicílio</p>
              </div>

              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  CEP {buscandoCep && <span className="text-zinc-500 normal-case">— buscando...</span>}
                </label>
                <input
                  value={cep}
                  onChange={(e) => handleCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-zinc-400 text-xs mb-1 block">Rua</label>
                  <input value={rua} onChange={(e) => setRua(e.target.value)}
                    placeholder="Nome da rua"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Número</label>
                  <input value={numero} onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Bairro</label>
                  <input value={bairro} onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Cidade</label>
                  <input value={cidade} onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600" />
                </div>
              </div>

              {erro && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">
                  {erro}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fecharModal}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando || telefoneExiste}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
                  {salvando ? "Salvando..." : "Cadastrar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}