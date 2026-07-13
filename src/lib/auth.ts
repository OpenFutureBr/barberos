import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { authConfig } from "./auth.config"

export { prisma as authPrisma }

/**
 * CLT/MEI/AUTônomo só definem forma de repasse — pra fins de permissão são
 * todos "profissional de corte" (mesmo template). Os RolePermissionTemplate
 * ficam salvos com a chave "PROFESSIONAL"; sem esse mapeamento, um usuário
 * com role BARBER_CLT/BARBER_MEI/AUTONOMO nunca batia com nenhum template e
 * ficava sem nenhum acesso por padrão.
 */
function chaveTemplateDoRole(role: string): string {
  if (role === "BARBER_CLT" || role === "BARBER_MEI" || role === "AUTONOMO") return "PROFESSIONAL"
  return role
}

async function montarUsuarioAutorizado(user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>) {
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
          where: { role: chaveTemplateDoRole(user.role), canView: true, ...orgFilter },
          select: { resource: true, organizationId: true },
        })
        // De-duplicate: org-specific overrides platform-wide
        const orgSpecific = new Set(templates.filter(t => t.organizationId).map(t => t.resource))
        permissions = templates.filter(t => t.organizationId || !orgSpecific.has(t.resource))
      }

      allowedResources = permissions.map((p) => p.resource)
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    username: user.username ?? "",
    isFirstLogin: user.isFirstLogin,
    allowedResources,
    planFeatures,

    organizationId: user.organizationId ?? null,
    establishmentId: user.establishmentId ?? null,
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
        pairingToken: { label: "Pairing", type: "text" },
      },
      async authorize(credentials) {
        try {
          // ── Login por QR (celular já logado aprovou o código) ──
          const pairingToken = String(credentials?.pairingToken ?? "").trim()
          if (pairingToken) {
            const pareamento = await prisma.loginPairing.findUnique({ where: { token: pairingToken } })
            if (!pareamento || pareamento.status !== "APPROVED" || !pareamento.userId) {
              console.log("[AUTH] Pairing inválido ou não aprovado")
              return null
            }
            if (pareamento.expiresAt < new Date()) {
              console.log("[AUTH] Pairing expirado")
              return null
            }

            // Consome o código (single-use) de forma atômica
            const consumido = await prisma.loginPairing.updateMany({
              where: { token: pairingToken, status: "APPROVED" },
              data: { status: "USED" },
            })
            if (consumido.count === 0) {
              console.log("[AUTH] Pairing já utilizado")
              return null
            }

            const user = await prisma.user.findUnique({ where: { id: pareamento.userId } })
            if (!user || !user.isActive) {
              console.log("[AUTH] Usuário do pairing inválido/inativo")
              return null
            }

            console.log("[AUTH] Login autorizado via QR:", user.username)
            return await montarUsuarioAutorizado(user)
          }

          // ── Login normal usuário/senha ──
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

          console.log("[AUTH] Login autorizado:", username)
          return await montarUsuarioAutorizado(user)
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