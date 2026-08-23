// Utilidades compartilhadas entre as telas de Caixa (hoje e Fluxo): cores
// customizáveis dos gráficos (persistidas por usuário/navegador) e export
// para Excel sem precisar de nenhuma biblioteca nova.

// Bucket genérico de período (hora ou dia) usado pelas views de Grid e Gráfico.
export type BucketPeriodo = {
  chave: string
  label: string
  diaSemana?: number // 0=domingo..6=sábado — só relevante na granularidade diária (Grid tipo calendário)
  entradas: number
  saidas: number
  projecao?: number
  porTipoEntrada: Record<string, number>
  porTipoSaida: Record<string, number>
}

export type CoresGrafico = { entrada: string; saida: string; projecao: string }

export const CORES_PADRAO: CoresGrafico = {
  entrada: "#22c55e", // green-500
  saida: "#ef4444", // red-500
  projecao: "#a855f7", // purple-500
}

const CHAVE_CORES = "caixa:cores-grafico"

export function lerCoresGrafico(): CoresGrafico {
  try {
    const raw = localStorage.getItem(CHAVE_CORES)
    if (!raw) return { ...CORES_PADRAO }
    return { ...CORES_PADRAO, ...JSON.parse(raw) }
  } catch {
    return { ...CORES_PADRAO }
  }
}

export function salvarCoresGrafico(cores: CoresGrafico) {
  try {
    localStorage.setItem(CHAVE_CORES, JSON.stringify(cores))
  } catch {
    // localStorage indisponível — segue sem persistir
  }
}

/**
 * Baixa um arquivo .xls a partir de linhas de dados — o Excel abre um HTML
 * table servido com esse content-type/extensão como planilha normal, sem
 * precisar de nenhuma lib de geração de xlsx.
 */
export function exportarExcel(nomeArquivo: string, colunas: string[], linhas: (string | number)[][]) {
  const linhasHtml = linhas
    .map((linha) => `<tr>${linha.map((v) => `<td>${typeof v === "number" ? v.toFixed(2).replace(".", ",") : v}</td>`).join("")}</tr>`)
    .join("")

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8" /></head>
    <body>
      <table border="1">
        <thead><tr>${colunas.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
        <tbody>${linhasHtml}</tbody>
      </table>
    </body>
    </html>
  `

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${nomeArquivo}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
