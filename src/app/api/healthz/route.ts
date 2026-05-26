import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  const checks: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "MISSING",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "MISSING",
  }

  let db = "unreachable"
  try {
    await prisma.$queryRaw`SELECT 1`
    db = "ok"
  } catch (e) {
    db = String(e)
  }

  return NextResponse.json({ checks, db })
}
