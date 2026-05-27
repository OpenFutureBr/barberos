import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Rotas públicas — sem autenticação
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/auth/setup") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // Sem sessão → redireciona para login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Primeiro acesso → força troca de senha (exceto se já está na página)
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
