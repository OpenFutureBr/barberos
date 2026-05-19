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
    max: 6,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: false,
  })

global.__prismaPool = pool

const prisma =
  global.__prismaClient ??
  new PrismaClient({ adapter: new PrismaPg(pool) })

global.__prismaClient = prisma

export default prisma
