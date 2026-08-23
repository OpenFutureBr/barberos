import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var __prismaPool: Pool | undefined

  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined
}

const isProd = process.env.NODE_ENV === "production"

const pool =
  global.__prismaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },

    // Supabase session pooler tem pool_size 15 no TOTAL, compartilhado por
    // todas as instâncias serverless simultâneas — não é 15 por instância.
    // Com max:8, bastavam 2 instâncias quentes ao mesmo tempo (2×8=16) para
    // estourar o teto e gerar "DriverAdapterError: max clients reached in
    // session mode" (visto em produção). max:4 dá margem para ~3 instâncias
    // simultâneas (3×4=12) antes de chegar no limite.
    // Em dev: hot reload cria múltiplas instâncias — manter baixo.
    max: isProd ? 4 : 2,
    min: isProd ? 1 : 0,

    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: isProd ? 30000 : 5000,
    keepAlive: isProd,
    allowExitOnIdle: !isProd,
  })

global.__prismaPool = pool

const prisma =
  global.__prismaClient ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
  })

global.__prismaClient = prisma

export default prisma