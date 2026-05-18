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
    max: 3,
    min: 0,
    idleTimeoutMillis: 0,        // não descarta conexões ociosas
    allowExitOnIdle: false,
  })

global.__prismaPool = pool

const prisma =
  global.__prismaClient ??
  new PrismaClient({ adapter: new PrismaPg(pool) })

global.__prismaClient = prisma

export default prisma
