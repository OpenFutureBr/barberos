import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export { prisma as authPrisma }

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
          include: { permissions: true },
        })

        if (!user?.passwordHash) return null

        const senhaCorreta = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        )
        if (!senhaCorreta) return null

        const allowedResources =
          user.role === "ADMIN"
            ? ["*"]
            : user.permissions.filter(p => p.canView).map(p => p.resource)

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username!,
          isFirstLogin: user.isFirstLogin,
          allowedResources,
        }
      },
    }),
  ],
})

export async function gerarUsername(name: string): Promise<string> {
  const partes = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const primeiro = partes[0] || "user"
  const resto = partes.slice(1)

  const candidatos: string[] = []
  if (resto.length > 0) {
    candidatos.push(`${primeiro}.${resto[resto.length - 1]}`)
    for (let i = 0; i < resto.length - 1; i++) {
      candidatos.push(`${primeiro}.${resto[i]}`)
    }
  }
  candidatos.push(primeiro)

  for (const c of candidatos) {
    const existe = await prisma.user.findUnique({ where: { username: c } })
    if (!existe) return c
  }

  const base = candidatos[0] ?? primeiro
  for (let n = 2; n < 100; n++) {
    const u = `${base}${n}`
    const existe = await prisma.user.findUnique({ where: { username: u } })
    if (!existe) return u
  }
  return `${primeiro}_${Date.now()}`
}
