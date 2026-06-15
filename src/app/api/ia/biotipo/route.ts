import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getIaConfig, callVision } from "@/lib/ia-providers"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { imageBase64, clientId, establishmentId } = await req.json().catch(() => ({}))
  if (!imageBase64) return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 })

  const cfg = await getIaConfig()
  if (!cfg.geminiApiKey && !cfg.groqApiKey) {
    return NextResponse.json({ error: "Nenhuma chave de IA configurada. Acesse Admin > Config. IA." }, { status: 503 })
  }

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
3. "catalogCuts": array com até 2 cortes do CATÁLOGO da barbearia, priorizando os mais adequados para o biotipo. O catálogo disponível é: ${nomesServicos || "(sem catálogo)"}
   - Cada item: { "name": "nome exato do catálogo", "pct": porcentagem_compatibilidade, "description": "motivo em uma frase" }
   - Se nenhum do catálogo se encaixar bem, retorne array vazio
4. "suggestedCuts": array com 2-3 cortes FORA DO CATÁLOGO ideais para este biotipo
   - Cada item: { "name": "nome do corte", "pct": porcentagem_compatibilidade, "description": "motivo em uma frase" }
5. "description": breve descrição do biotipo facial detectado (1-2 frases em português)

Responda APENAS com o JSON puro, sem markdown, sem blocos de código, sem explicações.`

  try {
    const raw = await callVision(cfg, prompt, imageBase64)
    const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim()
    const result = JSON.parse(jsonStr)

    // Enriquecer catalogCuts com serviceId
    if (Array.isArray(result.catalogCuts)) {
      result.catalogCuts = result.catalogCuts.map((c: any) => {
        const match = servicos.find(s => s.name.toLowerCase() === c.name?.toLowerCase())
        return { ...c, serviceId: match?.id ?? null }
      })
    }

    // Indica qual provider foi usado
    result._provider = cfg.visionProvider === "gemini" && cfg.geminiApiKey ? "gemini" : "groq"

    // Salvar no perfil do cliente se fornecido
    if (clientId) {
      const suggestions = {
        faceShape: result.faceShape,
        confidence: result.confidence,
        analysedAt: new Date().toISOString(),
        provider: result._provider,
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
    return NextResponse.json({ error: "Erro ao analisar: " + (err?.message ?? "desconhecido") }, { status: 500 })
  }
}
