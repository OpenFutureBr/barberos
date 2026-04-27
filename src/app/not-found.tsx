import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-amber-500 text-6xl font-bold mb-4">404</div>
        <div className="text-white text-xl font-bold mb-2">Página não encontrada</div>
        <div className="text-zinc-500 text-sm mb-6">Esta tela ainda não foi construída ou o endereço está incorreto.</div>
        <Link href="/dashboard" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
          ← Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}