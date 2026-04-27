import DashboardLayout from "@/components/layout/DashboardLayout"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-4 gap-3 mb-4">

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500"></div>
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Faturamento hoje</div>
          <div className="text-amber-400 text-2xl font-bold">R$ 1.840</div>
          <div className="text-zinc-600 text-xs mt-1"><span className="text-green-400">↑ 23%</span> vs ontem</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500"></div>
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Atendimentos</div>
          <div className="text-green-400 text-2xl font-bold">12</div>
          <div className="text-zinc-600 text-xs mt-1">3 pendentes hoje</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500"></div>
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Ticket médio</div>
          <div className="text-blue-400 text-2xl font-bold">R$ 153</div>
          <div className="text-zinc-600 text-xs mt-1"><span className="text-green-400">↑ 8%</span> este mês</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500"></div>
          <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Clientes VIP</div>
          <div className="text-purple-400 text-2xl font-bold">9</div>
          <div className="text-zinc-600 text-xs mt-1">2 retornando hoje</div>
        </div>

      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span className="text-black font-bold text-xl">B</span>
        </div>
        <h2 className="text-white text-xl font-bold mb-1">BarberOS está no ar! 🎉</h2>
        <p className="text-zinc-400 text-sm">T-001 ✅ T-002 ✅ T-003 ✅ T-004 ✅</p>
        </div>

    </DashboardLayout>
  )
}