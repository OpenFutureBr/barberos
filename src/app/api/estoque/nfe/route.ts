import { NextResponse } from "next/server"

// Mapa de códigos de UF → estado
const UF: Record<string, string> = {
  "11":"RO","12":"AC","13":"AM","14":"RR","15":"PA","16":"AP","17":"TO",
  "21":"MA","22":"PI","23":"CE","24":"RN","25":"PB","26":"PE","27":"AL","28":"SE","29":"BA",
  "31":"MG","32":"ES","33":"RJ","35":"SP",
  "41":"PR","42":"SC","43":"RS",
  "50":"MS","51":"MT","52":"GO","53":"DF",
}

function parsearChave(chave: string) {
  const c = chave.replace(/\D/g, "")
  if (c.length !== 44) return null

  const cUF     = c.slice(0, 2)
  const aamm    = c.slice(2, 6)
  const cnpj    = c.slice(6, 20)
  const mod     = c.slice(20, 22)
  const serie   = c.slice(22, 25)
  const nNF     = c.slice(25, 34)

  const ano  = parseInt(aamm.slice(0, 2)) + 2000
  const mes  = parseInt(aamm.slice(2, 4))

  return {
    chave: c,
    estado: UF[cUF] ?? cUF,
    cnpjEmitente: cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
    modelo: mod === "55" ? "NF-e" : mod === "65" ? "NFC-e" : `Modelo ${mod}`,
    serie: serie.replace(/^0+/, "") || "1",
    numero: nNF.replace(/^0+/, ""),
    emissao: `${String(mes).padStart(2,"0")}/${ano}`,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chave = searchParams.get("chave") ?? ""

  const info = parsearChave(chave)
  if (!info) {
    return NextResponse.json({ error: "Chave de acesso inválida. Deve conter 44 dígitos." }, { status: 400 })
  }

  // Tenta consultar via SEFAZ/serviço configurado (ponto de extensão)
  const nfeServiceUrl = process.env.NFE_SERVICE_URL
  if (nfeServiceUrl) {
    try {
      const res = await fetch(`${nfeServiceUrl}?chave=${info.chave}`, {
        headers: { Authorization: `Bearer ${process.env.NFE_SERVICE_TOKEN ?? ""}` },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ ...info, itens: data.itens ?? [] })
      }
    } catch { /* segue sem o serviço */ }
  }

  // Sem serviço configurado — retorna info da chave + lista vazia para preenchimento manual
  return NextResponse.json({
    ...info,
    itens: [],
    aviso: "Consulta automática de itens requer integração com SEFAZ ou serviço NF-e (configure NFE_SERVICE_URL).",
  })
}
