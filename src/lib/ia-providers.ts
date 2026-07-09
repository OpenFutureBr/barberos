import prisma from "./prisma"

export type IaConfig = {
  groqApiKey: string
  geminiApiKey: string
  visionProvider: "gemini" | "groq"
  textProvider: "groq" | "gemini"
}

export async function getIaConfig(): Promise<IaConfig> {
  const rows = await prisma.platformConfig.findMany({
    where: { key: { in: ["groq_api_key", "gemini_api_key", "ia_vision_provider", "ia_text_provider"] } },
  })
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return {
    groqApiKey:      m["groq_api_key"]       ?? process.env.GROQ_API_KEY   ?? "",
    geminiApiKey:    m["gemini_api_key"]      ?? process.env.GEMINI_API_KEY ?? "",
    visionProvider:  (m["ia_vision_provider"] as "gemini" | "groq") ?? "gemini",
    textProvider:    (m["ia_text_provider"]   as "groq" | "gemini") ?? "groq",
  }
}

// ─── Gemini Vision ────────────────────────────────────────────────────────────

export async function geminiVision(apiKey: string, prompt: string, imageBase64: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
}

// ─── Groq Vision ─────────────────────────────────────────────────────────────

export async function groqVision(apiKey: string, prompt: string, imageBase64: string): Promise<string> {
  const { default: Groq } = await import("groq-sdk")
  const groq = new Groq({ apiKey })
  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    }],
    max_tokens: 800,
    temperature: 0.3,
  })
  return completion.choices[0]?.message?.content ?? ""
}

// ─── Groq Text ───────────────────────────────────────────────────────────────

export async function groqText(apiKey: string, prompt: string): Promise<string> {
  const { default: Groq } = await import("groq-sdk")
  const groq = new Groq({ apiKey })
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.4,
  })
  return completion.choices[0]?.message?.content ?? ""
}

// ─── Gemini Text ─────────────────────────────────────────────────────────────

export async function geminiText(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1000 },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini error ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
}

// ─── Gemini Image Edit (gera imagem a partir de imagem + instrução) ──────────
//
// Só o Gemini tem modelo de geração/edição de imagem no catálogo — o Groq só
// tem LLMs e visão-para-texto, sem saída de imagem. Usa o modelo com suporte
// a responseModalities TEXT+IMAGE ("Nano Banana").

export type ImagemGerada = { mimeType: string; data: string }

export async function geminiEditarImagem(apiKey: string, prompt: string, imageBase64: string): Promise<ImagemGerada> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          ],
        }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: any) => p.inlineData || p.inline_data)
  const inline = imagePart?.inlineData ?? imagePart?.inline_data
  if (!inline?.data) {
    throw new Error("Gemini não retornou imagem — tente novamente ou ajuste a foto.")
  }
  return { mimeType: inline.mimeType ?? inline.mime_type ?? "image/png", data: inline.data }
}

// ─── Helpers unificados ───────────────────────────────────────────────────────

export async function callVision(cfg: IaConfig, prompt: string, imageBase64: string): Promise<string> {
  if (cfg.visionProvider === "gemini" && cfg.geminiApiKey) {
    return geminiVision(cfg.geminiApiKey, prompt, imageBase64)
  }
  if (cfg.groqApiKey) {
    return groqVision(cfg.groqApiKey, prompt, imageBase64)
  }
  throw new Error("Nenhum provider de visão configurado. Acesse Admin > Config. IA.")
}

export async function callText(cfg: IaConfig, prompt: string): Promise<string> {
  if (cfg.textProvider === "groq" && cfg.groqApiKey) {
    return groqText(cfg.groqApiKey, prompt)
  }
  if (cfg.geminiApiKey) {
    return geminiText(cfg.geminiApiKey, prompt)
  }
  if (cfg.groqApiKey) {
    return groqText(cfg.groqApiKey, prompt)
  }
  throw new Error("Nenhum provider de texto configurado. Acesse Admin > Config. IA.")
}
