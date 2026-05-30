import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

function redirectTo(req: Parameters<Parameters<typeof auth>[0]>[0], pathname: string) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000"
  const proto = req.headers.get("x-forwarded-proto") || "http"
  return NextResponse.redirect(`${proto}://${host}${pathname}`)
}

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // Rotas públicas
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
    return redirectTo(req, "/login")
  }

  // Primeiro acesso → troca de senha obrigatória
  if (req.auth.user?.isFirstLogin && pathname !== "/alterar-senha") {
    return redirectTo(req, "/alterar-senha")
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icon-.*\\.png|sw\\.js).*)",
  ],
}
