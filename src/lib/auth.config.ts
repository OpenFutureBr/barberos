import type { NextAuthConfig } from "next-auth"

// Configuração Edge-compatível — sem crypto, pg ou bcrypt.
// Usada pelo middleware/proxy para validar o JWT sem chamar o banco.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    // Antes usava o padrão do NextAuth (30 dias) — reduzido pra limitar a
    // janela de exposição caso um token vaze/seja roubado.
    maxAge: 7 * 24 * 60 * 60, // 7 dias
  },
  providers: [], // providers reais ficam em auth.ts (Node.js)
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.username = user.username
        token.isFirstLogin = user.isFirstLogin
        token.allowedResources = user.allowedResources
        token.planFeatures = (user as any).planFeatures ?? []
        token.organizationId = user.organizationId ?? null
        token.establishmentId = user.establishmentId ?? null
      }

      if (trigger === "update" && session) {
        if (session.isFirstLogin !== undefined) {
          token.isFirstLogin = session.isFirstLogin
        }

        if (session.allowedResources !== undefined) {
          token.allowedResources = session.allowedResources
        }

        if (session.organizationId !== undefined) {
          token.organizationId = session.organizationId
        }

        if (session.establishmentId !== undefined) {
          token.establishmentId = session.establishmentId
        }
      }

      return token
    },

    async session({ session, token }: any) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.username = token.username as string
      session.user.isFirstLogin = token.isFirstLogin as boolean
      session.user.allowedResources = token.allowedResources as string[]
      session.user.planFeatures = (token.planFeatures ?? []) as string[]
      session.user.organizationId = (token.organizationId as string | null) ?? null
      session.user.establishmentId = (token.establishmentId as string | null) ?? null

      return session
    },
  },
} satisfies NextAuthConfig