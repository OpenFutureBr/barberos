import { NextResponse } from "next/server"

const EVO_URL = process.env.EVOLUTION_API_URL
const EVO_KEY = process.env.EVOLUTION_API_KEY
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "barberos"

export async function GET() {
  try {
    const res = await fetch(`${EVO_URL}/instance/connectionState/${EVO_INSTANCE}`, {
      headers: { "apikey": EVO_KEY ?? "" },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Cria a instância se não existir
    const res = await fetch(`${EVO_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVO_KEY ?? "",
      },
      body: JSON.stringify({
        instanceName: EVO_INSTANCE,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
