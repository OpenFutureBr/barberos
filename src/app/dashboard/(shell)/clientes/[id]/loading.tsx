import PageSkeleton from "@/components/PageSkeleton"

// Tela dinâmica: sem isto o clique esperava a resposta do servidor sem
// mostrar nada. Com o loading.tsx o Next troca de tela na hora e mostra o
// esqueleto enquanto a página carrega.
export default function Loading() {
  return <PageSkeleton rows={4} />
}
