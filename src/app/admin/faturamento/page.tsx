import Link from "next/link"

export default function AdminFaturamentoPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Faturamento</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Controle de assinaturas, cobranças e inadimplência.
            </p>
          </div>

          <Link
            href="/admin"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700"
          >
            ← Voltar
          </Link>
        </div>

        <section className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase mb-1">MRR</div>
            <div className="text-2xl font-bold text-amber-400">—</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase mb-1">ARR</div>
            <div className="text-2xl font-bold">—</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase mb-1">Ativos</div>
            <div className="text-2xl font-bold text-green-400">—</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-zinc-500 text-xs uppercase mb-1">Atrasados</div>
            <div className="text-2xl font-bold text-red-400">—</div>
          </div>
        </section>
      </div>
    </main>
  )
}