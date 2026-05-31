import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var __prismaPool: Pool | undefined

  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined
}

const pool =
  global.__prismaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },

    // Supabase session pooler: pool_size 15 no total.
    // Next.js dev pode criar múltiplas instâncias por hot reload —
    // manter max baixo evita esgotar as sessões disponíveis.
    max: 2,
    min: 0,

    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 5000,   // libera conexões ociosas rapidamente
    keepAlive: false,          // não mantém conexões abertas sem uso
    allowExitOnIdle: true,
  })

global.__prismaPool = pool

const prisma =
  global.__prismaClient ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
  })

global.__prismaClient = prisma

export default prisma