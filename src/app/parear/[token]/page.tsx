import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import ConfirmarPareamento from "./ConfirmarPareamento"

export default async function PearPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await auth()

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/parear/${token}`)}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500 text-black text-xl font-black mb-4">
          ✂
        </div>
        <h1 className="text-white text-lg font-bold mb-1">Confirmar acesso</h1>
        <p className="text-zinc-500 text-sm mb-6">
          Aprovar login com a conta <span className="text-zinc-300 font-medium">{session.user.username}</span> neste outro dispositivo?
        </p>
        <ConfirmarPareamento token={token} />
      </div>
    </div>
  )
}
