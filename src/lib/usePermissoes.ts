"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import type { MenuGroup, MenuItem } from "@/lib/menu-items"

// Fonte unica da regra de visibilidade de menu no cliente. Antes o par
// podeVer/planoPermite estava copiado em Sidebar, DrawerNav e MobileNav, e as
// copias divergiram: o MobileNav decidia isAdmin so por allowedResources
// ("*"), ignorando role === "ADMIN", e nao aceitava planFeatures ["*"] — ou
// seja, um ADMIN cujo allowedResources nao tivesse "*" via itens na sidebar
// que nao apareciam na nav mobile.
//
// Para a checagem no servidor (API routes), use temPermissao/
// bloqueioSemPermissao de @/lib/permissoes — esta aqui e so de apresentacao.
export function usePermissoes() {
  const { data: session } = useSession()

  return useMemo(() => {
    const user = session?.user
    const allowedResources = user?.allowedResources ?? []
    const planFeatures = user?.planFeatures ?? []
    const isAdmin = user?.role === "ADMIN" || allowedResources.includes("*")

    // Sem sessao carregada ainda, libera: o menu aparece inteiro por um
    // instante em vez de piscar vazio. O proxy.ts e as API routes continuam
    // barrando de verdade quem nao tem acesso.
    const carregando = !session

    function podeVer(resource: string): boolean {
      if (carregando || isAdmin) return true
      return allowedResources.includes(resource)
    }

    function planoPermite(feature?: string): boolean {
      if (!feature) return true // item sem restricao de plano
      if (carregando || isAdmin) return true
      return planFeatures.includes("*") || planFeatures.includes(feature)
    }

    function temAcesso(item: Pick<MenuItem, "resource" | "feature">): boolean {
      return podeVer(item.resource) && planoPermite(item.feature)
    }

    // Um grupo aparece no menu se sobrou pelo menos um item visivel nele.
    function itensVisiveis(grupo: MenuGroup): MenuItem[] {
      return grupo.items.filter(temAcesso)
    }

    function gruposVisiveis(grupos: MenuGroup[]): MenuGroup[] {
      return grupos.filter(g => g.items.some(temAcesso))
    }

    return { isAdmin, carregando, podeVer, planoPermite, temAcesso, itensVisiveis, gruposVisiveis }
  }, [session])
}
