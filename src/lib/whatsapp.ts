export async function enviarWhatsApp(telefone: string, mensagem: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch("/api/whatsapp/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone, mensagem }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, erro: data.error ?? "Erro ao enviar" }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: String(e) }
  }
}
