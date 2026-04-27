import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />
      <Topbar />
      <main className="ml-48 pt-11 min-h-screen">
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  )
}