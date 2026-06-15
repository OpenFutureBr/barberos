import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import Groq from "groq-sdk"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { imageBase64, clientId, establishmentId } = await req.json().catch(() => ({}))
  if (!imageBase64) return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 })

  // Busca chave Groq
  const configRow = await prisma.platformConfig.findUnique({ where: { key: "groq_api_key" } })
  const apiKey = configRow?.value ?? process.env.GROQ_API_KEY ?? ""
  if (!apiKey) return NextResponse.json({ error: "Chave Groq não configurada. Acesse Admin > Configurações." }, { status: 503 })

  // Busca serviços do estabelecimento para sugestões de catálogo
  const servicos = establishmentId
    ? await prisma.service.findMany({
        where: { establishmentId, isActive: true },
        select: { id: true, name: true, category: true },
      })
    : []

  const nomesServicos = servicos.map(s => s.name).join(", ")

  const prompt = `Você é um especialista em Visagismo e análise facial para barbearias.

Analise a foto deste rosto e retorne um JSON com:
1. "faceShape": formato do rosto (oval | redondo | quadrado | coracao | oblongo | triangular)
2. "confidence": porcentagem de confiança (0-100)
3. "catalogCuts": array com 2 cortes do CATÁLOGO da barbearia, priorizando os mais adequados. O catálogo disponível é: ${nomesServicos || "(sem catálogo)"}
   - Cada item: { "name": "nome exato do catálogo", "pct": porcentagem_compatibilidade, "description": "motivo em uma frase" }
4. "suggestedCuts": array com 2-3 cortes FORA DO CATÁLOGO que seriam ideais para este biotipo
   - Cada item: { "name": "nome do corte", "pct": porcentagem_compatibilidade, "description": "motivo em uma frase" }
5. "description": breve descrição do biotipo facial detectado (1-2 frases)

Responda APENAS com o JSON, sem markdown, sem explicações extras.
Se não houver serviços no catálogo que combinem bem com o biotipo, retorne um array vazio em catalogCuts.`

  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content ?? "{}"
    const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim()
    const result = JSON.parse(jsonStr)

    // Enriquecer catalogCuts com serviceId
    if (Array.isArray(result.catalogCuts)) {
      result.catalogCuts = result.catalogCuts.map((c: any) => {
        const match = servicos.find(s => s.name.toLowerCase() === c.name?.toLowerCase())
        return { ...c, serviceId: match?.id ?? null }
      })
    }

    // Salvar no perfil do cliente se fornecido
    if (clientId) {
      const suggestions = {
        faceShape: result.faceShape,
        confidence: result.confidence,
        analysedAt: new Date().toISOString(),
        catalogCuts: result.catalogCuts ?? [],
        suggestedCuts: result.suggestedCuts ?? [],
        description: result.description ?? "",
        chosenCut: null,
        chosenServiceId: null,
      }
      await prisma.client.update({
        where: { id: clientId },
        data: {
          faceShape: result.faceShape,
          aiAnalysedAt: new Date(),
          iaSuggestions: suggestions as any,
        },
      })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[ia/biotipo]", err)
    return NextResponse.json({ error: "Erro ao analisar imagem: " + (err?.message ?? "desconhecido") }, { status: 500 })
  }
}
