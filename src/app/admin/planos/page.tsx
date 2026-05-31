import Link from "next/link"

export default function AdminPlanosPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Planos</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Gestão de planos, limites e preços do SaaS.
            </p>
          </div>

          <Link
            href="/admin"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm border border-zinc-700"
          >
            ← Voltar
          </Link>
        </div>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="text-zinc-500 text-sm">
            Tela base criada. No próximo passo vamos listar os dados da tabela
            `plan_definitions`.
          </div>
        </section>
      </div>
    </main>
  )
}
