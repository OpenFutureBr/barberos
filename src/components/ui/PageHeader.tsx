// Cabecalho de pagina: titulo + subtitulo a esquerda, acoes a direita. Com
// flex-wrap, no celular as acoes descem para a linha de baixo em vez de
// espremer o titulo ou vazar da tela (o padrao antigo era justify-between
// sem quebra).
export default function PageHeader({ titulo, subtitulo, children }: {
  titulo: React.ReactNode
  subtitulo?: React.ReactNode
  /** Acoes (botoes, filtros) a direita */
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="text-fg text-xl font-bold">{titulo}</h1>
        {subtitulo && <p className="text-fg-3 text-sm">{subtitulo}</p>}
      </div>
      {children}
    </div>
  )
}
