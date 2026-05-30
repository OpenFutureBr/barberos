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

    // Aumentado para evitar timeout quando várias APIs carregam juntas
    max: 15,
    min: 0,

    // Dá mais tempo para abrir conexão antes de falhar
    connectionTimeoutMillis: 15000,

    // Fecha conexões paradas depois de 30s
    idleTimeoutMillis: 30000,

    // Ajuda em conexões remotas
    keepAlive: true,
    allowExitOnIdle: false,
  })

global.__prismaPool = pool

const prisma =
  global.__prismaClient ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
  })

global.__prismaClient = prisma

export default prisma