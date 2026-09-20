import DashboardLayout from "@/components/layout/DashboardLayout"

// Shell do dashboard (sidebar, topbar, nav mobile, modais globais) montado uma
// unica vez para todas as paginas do grupo. Antes cada page.tsx se embrulhava
// no <DashboardLayout>, entao o shell remontava a cada navegacao — perdendo o
// carrinho da venda, o scroll da sidebar e refazendo os prefetches.
//
// O grupo `(shell)` nao aparece na URL: `(shell)/agenda` continua servindo
// /dashboard/agenda. Ele existe para deixar DE FORA as paginas de tela cheia,
// que nao devem herdar o shell:
//   - dashboard/painel-tv          — painel para TV da barbearia
//   - dashboard/unidades/relatorio — relatorio pensado para impressao
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
