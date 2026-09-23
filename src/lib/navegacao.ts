"use client"

import { usePathname } from "next/navigation"

export const ROTA_INICIAL = "/dashboard"

/* ---------------------------------------------------------------------------
   Como o botao "voltar" do celular deve se comportar.

   O problema: cada troca de tela pelo menu empilhava uma entrada no historico.
   Depois de meia hora de uso, voltar significava desfazer uma a uma TODAS as
   telas visitadas — no app instalado, onde nao ha barra de endereco, sair
   daquilo virava um tranco.

   A regra: navegacao de MENU (sidebar, gaveta, barra de baixo, busca global)
   substitui a entrada atual quando ja se esta dentro do dashboard, em vez de
   empilhar. Assim o historico fica sempre com no maximo duas entradas:

       [ ... , /dashboard , tela atual ]

   e um toque em voltar leva direto a tela principal.

   Sair de /dashboard e o unico caso que EMPILHA — e o que garante que a tela
   principal continue logo abaixo na pilha, em vez de a gente voltar pro que
   veio antes dela (o login, por exemplo).

   Navegacao de APROFUNDAMENTO (lista -> ficha do cliente, por exemplo) segue
   empilhando normalmente: ali voltar tem que devolver a lista, nao pular pra
   tela principal. Por isso a regra vale so nos componentes de menu, e nao num
   interceptador global de historico.
   --------------------------------------------------------------------------- */
export function useSubstituirHistorico(): boolean {
  return usePathname() !== ROTA_INICIAL
}
