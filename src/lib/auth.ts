import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { authConfig } from "./auth.config"

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
        try {
          const username = String(credentials?.username ?? "").trim()
          const password = String(credentials?.password ?? "")

          if (!username || !password) {
            console.log("[AUTH] Usuário ou senha não informado")
            return null
          }

          console.log("[AUTH] Tentando login:", username)

          const user = await prisma.user.findUnique({
            where: {
              username,
            },
          })

          if (!user) {
            console.log("[AUTH] Usuário não encontrado:", username)
            return null
          }

          if (!user.isActive) {
            console.log("[AUTH] Usuário inativo:", username)
            return null
          }

          if (!user.passwordHash) {
            console.log("[AUTH] Usuário sem passwordHash:", username)
            return null
          }

          const senhaCorreta = await bcrypt.compare(password, user.passwordHash)

          if (!senhaCorreta) {
            console.log("[AUTH] Senha incorreta para:", username)
            return null
          }

          let allowedResources: string[] = []
          let planFeatures: string[] = []

          if (user.role === "ADMIN") {
            allowedResources = ["*"]
            planFeatures = ["*"]
          } else {
            const org = user.organizationId
              ? await prisma.organization.findUnique({
                  where: { id: user.organizationId },
                  include: { plan: { select: { features: true } } },
                })
              : null

            if (org?.plan?.features) {
              planFeatures = Object.entries(org.plan.features as Record<string, boolean>)
                .filter(([, v]) => v)
                .map(([k]) => k)
            }

            if (user.role === "ORG_OWNER") {
              allowedResources = ["*"]
            } else {
              // First try explicit UserPermission entries
              let permissions = await prisma.userPermission.findMany({
                where: { userId: user.id, canView: true },
                select: { resource: true },
              })

              // Fall back to RolePermissionTemplate if no explicit permissions set
              if (permissions.length === 0) {
                const orgFilter = user.organizationId
                  ? { OR: [{ organizationId: user.organizationId }, { organizationId: null }] }
                  : { organizationId: null }

                const templates = await prisma.rolePermissionTemplate.findMany({
                  where: { role: user.role, canView: true, ...orgFilter },
                  select: { resource: true, organizationId: true },
                })
                // De-duplicate: org-specific overrides platform-wide
                const orgSpecific = new Set(templates.filter(t => t.organizationId).map(t => t.resource))
                permissions = templates.filter(t => t.organizationId || !orgSpecific.has(t.resource))
              }

              allowedResources = permissions.map((p) => p.resource)
            }
          }

          console.log("[AUTH] Login autorizado:", username)

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            username: user.username ?? username,
            isFirstLogin: user.isFirstLogin,
            allowedResources,
            planFeatures,

            organizationId: user.organizationId ?? null,
            establishmentId: user.establishmentId ?? null,
          }
        } catch (error) {
          console.error("[AUTH] Erro no authorize:", error)
          return null
        }
      },
    }),
  ],
})

export async function gerarUsername(name: string): Promise<string> {
  const partes = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
    const existe = await prisma.user.findUnique({
      where: {
        username: c,
      },
    })

    if (!existe) return c
  }

  const base = candidatos[0] ?? primeiro

  for (let n = 2; n < 100; n++) {
    const u = `${base}${n}`

    const existe = await prisma.user.findUnique({
      where: {
        username: u,
      },
    })

    if (!existe) return u
  }

  return `${primeiro}_${Date.now()}`
}