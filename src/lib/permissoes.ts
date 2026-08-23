import { NextResponse } from "next/server"

type SessionUserComPermissoes = {
  role?: string | null
  allowedResources?: string[] | null
} | null | undefined

/**
 * Confere se a sessão tem acesso a um recurso (mesma regra usada pelo
 * Sidebar/proxy pra decidir o que mostrar/liberar): ADMIN e "*" sempre
 * passam, senão precisa do slug explícito em allowedResources.
 */
export function temPermissao(user: SessionUserComPermissoes, resource: string): boolean {
  if (!user) return false
  if (user.role === "ADMIN") return true
  const allowed = user.allowedResources ?? []
  return allowed.includes("*") || allowed.includes(resource)
}

/**
 * Guard pra usar no topo de uma API route: retorna uma NextResponse 403 se
 * a sessão não tiver o recurso liberado, ou null se pode seguir.
 * Isso é defesa em profundidade — o proxy.ts já bloqueia a navegação da
 * página, mas a rota de API continua acessível via fetch direto sem isso.
 */
export function bloqueioSemPermissao(user: SessionUserComPermissoes, resource: string): NextResponse | null {
  if (temPermissao(user, resource)) return null
  return NextResponse.json({ error: "Sem permissão para este recurso." }, { status: 403 })
}
