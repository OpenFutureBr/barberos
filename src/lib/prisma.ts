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

    // Supabase session pooler tem pool_size 15 no total.
    // Em prod: mais conexões = queries paralelas de verdade.
    // Em dev: hot reload cria múltiplas instâncias — manter baixo.
    max: isProd ? 8 : 2,
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