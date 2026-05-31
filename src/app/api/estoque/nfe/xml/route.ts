import { NextResponse } from "next/server"
import { XMLParser } from "fast-xml-parser"

const UF: Record<string, string> = {
  "11":"RO","12":"AC","13":"AM","14":"RR","15":"PA","16":"AP","17":"TO",
  "21":"MA","22":"PI","23":"CE","24":"RN","25":"PB","26":"PE","27":"AL","28":"SE","29":"BA",
  "31":"MG","32":"ES","33":"RJ","35":"SP",
  "41":"PR","42":"SC","43":"RS",
  "50":"MS","51":"MT","52":"GO","53":"DF",
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "det", // det é sempre array (vários itens)
  removeNSPrefix: true,              // ignora namespace xmlns:nfe
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const arquivo = formData.get("xml") as File | null

    if (!arquivo) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
    }

    if (!arquivo.name.endsWith(".xml")) {
      return NextResponse.json({ error: "O arquivo deve ser um XML (.xml)." }, { status: 400 })
    }

    const texto = await arquivo.text()

    // Valida que é um XML de NF-e
    if (!texto.includes("infNFe") && !texto.includes("nfeProc")) {
      return NextResponse.json({ error: "Arquivo não reconhecido como NF-e válida." }, { status: 400 })
    }

    const parsed = parser.parse(texto)

    // O XML pode vir como nfeProc > NFe > infNFe  ou  NFe > infNFe
    const infNFe =
      parsed?.nfeProc?.NFe?.infNFe ??
      parsed?.NFe?.infNFe ??
      parsed?.nfeProc?.nfeProc?.NFe?.infNFe ??
      null

    if (!infNFe) {
      return NextResponse.json({ error: "Estrutura da NF-e não reconhecida." }, { status: 400 })
    }

    const ide   = infNFe.ide  ?? {}
    const emit  = infNFe.emit ?? {}
    const dets  = Array.isArray(infNFe.det) ? infNFe.det : infNFe.det ? [infNFe.det] : []

    // Data de emissão
    const dhEmi  = String(ide.dhEmi ?? ide.dEmi ?? "")
    const dataEmissao = dhEmi
      ? new Date(dhEmi).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" })
      : ""

    // Itens
    const itens = dets.map((det: any) => {
      const prod = det.prod ?? {}
      return {
        descricao:     String(prod.xProd ?? ""),
        ean:           String(prod.cEAN  ?? prod.cEANTrib ?? ""),
        ncm:           String(prod.NCM   ?? ""),
        unidade:       String(prod.uCom  ?? ""),
        quantidade:    Number(prod.qCom  ?? 1),
        valorUnitario: Number(prod.vUnCom ?? 0),
        valorTotal:    Number(prod.vProd  ?? 0),
      }
    })

    return NextResponse.json({
      chave:        String(infNFe["@_Id"] ?? "").replace(/^NFe/, ""),
      estado:       UF[String(ide.cUF ?? "")] ?? String(ide.cUF ?? ""),
      modelo:       ide.mod === 65 ? "NFC-e" : "NF-e",
      serie:        String(ide.serie ?? ""),
      numero:       String(ide.nNF   ?? ""),
      emissao:      dataEmissao,
      cnpjEmitente: String(emit.CNPJ ?? "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
      nomeEmitente: String(emit.xNome ?? emit.xFant ?? ""),
      itens,
    })
  } catch (err) {
    console.error("[POST /api/estoque/nfe/xml]", err)
    return NextResponse.json({ error: "Erro ao processar o XML." }, { status: 500 })
  }
}
