import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Rotas públicas — sem autenticação necessária
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // Sem sessão → login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Primeiro acesso → troca de senha obrigatória
  if (req.auth.user?.isFirstLogin && pathname !== "/alterar-senha") {
    return NextResponse.redirect(new URL("/alterar-senha", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icon-.*\\.png|sw\\.js).*)",
  ],
}
