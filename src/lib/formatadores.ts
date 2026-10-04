// Formatação de dinheiro única para o sistema inteiro.
//
// Antes havia 17 cópias de fmtMoeda e ~57 valores montados à mão com
// `R$ ${v.toFixed(2)}` — na mesma tela apareciam "R$ 1.234,50" e "R$ 1234.50".
//
// Não use isto para valores que vão para <input type="number"> nem para o
// payload do PIX (EMV): ali o formato tem de ser com ponto, `v.toFixed(2)`.

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export function fmtMoeda(
  v: number | string | null | undefined,
  opts?: { ocultar?: boolean },
): string {
  if (opts?.ocultar) return "R$ ••••"
  const n = Number(v ?? 0)
  return BRL.format(Number.isFinite(n) ? n : 0)
}
