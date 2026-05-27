import type { NextAuthConfig } from "next-auth"

// Configuração Edge-compatível — sem crypto, pg ou bcrypt.
// Usada pelo middleware para validar o JWT sem chamar o banco.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  providers: [], // providers reais ficam em auth.ts (Node.js)
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.username = user.username
        token.isFirstLogin = user.isFirstLogin
        token.allowedResources = user.allowedResources
      }
      if (trigger === "update" && session) {
        if (session.isFirstLogin !== undefined) token.isFirstLogin = session.isFirstLogin
        if (session.allowedResources !== undefined) token.allowedResources = session.allowedResources
      }
      return token
    },
    async session({ session, token }: any) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.username = token.username as string
      session.user.isFirstLogin = token.isFirstLogin as boolean
      session.user.allowedResources = token.allowedResources as string[]
      return session
    },
  },
} satisfies NextAuthConfig
