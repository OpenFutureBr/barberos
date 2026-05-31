import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    mrr: 0,
    arr: 0,
    ativos: 0,
    atrasados: 0,
    items: [],
  })
}