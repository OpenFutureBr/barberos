import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { pathToSlug } from "@/lib/resources"
import { temPermissao } from "@/lib/permissoes"

function redirectTo(
  req: Parameters<Parameters<typeof auth>[0]>[0],
  pathname: string,
) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000"

  const proto = req.headers.get("x-forwarded-proto") || "http"

  return NextResponse.redirect(`${proto}://${host}${pathname}`)
}

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // Login pode passar sem sessão
  if (pathname.startsWith("/login")) {
    return NextResponse.next()
  }

  // Sem sessão → login
  if (!req.auth) {
    return redirectTo(req, "/login")
  }

  // Primeiro acesso → troca de senha obrigatória
  // Permite acessar a própria tela de alteração
  if (req.auth.user?.isFirstLogin && pathname !== "/alterar-senha") {
    return redirectTo(req, "/alterar-senha")
  }

  const role = req.auth.user?.role

  // ADMIN não acessa o dashboard da barbearia — vai direto para /admin
  if (role === "ADMIN" && pathname.startsWith("/dashboard")) {
    return redirectTo(req, "/admin")
  }

  // Somente ADMIN pode acessar /admin
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return redirectTo(req, "/dashboard")
  }

  // Bloqueia navegação direta por URL a páginas fora das permissões do
  // usuário — antes só o Sidebar escondia o link, mas a página abria igual
  // pra quem digitasse/adivinhasse a URL. A home "/dashboard" fica sempre
  // acessível (evita loop de redirect pra ela mesma).
  if (pathname.startsWith("/dashboard") && pathname !== "/dashboard" && role !== "ORG_OWNER") {
    const resource = pathToSlug(pathname)
    if (resource && !temPermissao(req.auth?.user, resource)) {
      return redirectTo(req, "/dashboard?acesso_negado=1")
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/alterar-senha"],
}