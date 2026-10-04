import prisma from "@/lib/prisma"

export type ItemTemplate = {
  role: string
  resource: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

/**
 * Grava modelos de permissão por cargo de uma organização (ou os globais,
 * com organizationId null).
 *
 * Antes eram 2 consultas por item, todas em paralelo — dezenas de cargos ×
 * recursos disputando um pool de 4 conexões. Agora: 1 leitura dos existentes +
 * 1 transação com os updates e um createMany. Não dá para usar upsert pela
 * chave única porque organizationId pode ser null (null não é igual a null).
 */
export async function salvarTemplates(organizationId: string | null, itens: ItemTemplate[]): Promise<number> {
  if (itens.length === 0) return 0

  const existentes = await prisma.rolePermissionTemplate.findMany({
    where: { organizationId, role: { in: [...new Set(itens.map(i => i.role))] } },
    select: { id: true, role: true, resource: true },
  })
  const idPor = new Map(existentes.map(e => [`${e.role}|${e.resource}`, e.id]))

  // Último valor vence se o mesmo cargo/recurso vier repetido
  const porChave = new Map(itens.map(i => [`${i.role}|${i.resource}`, i]))
  const updates = []
  const novos = []
  for (const [chave, { role, resource, canView, canCreate, canEdit, canDelete }] of porChave) {
    const id = idPor.get(chave)
    if (id) {
      updates.push(prisma.rolePermissionTemplate.update({ where: { id }, data: { canView, canCreate, canEdit, canDelete } }))
    } else {
      novos.push({ role, resource, canView, canCreate, canEdit, canDelete, organizationId })
    }
  }

  await prisma.$transaction([
    ...updates,
    ...(novos.length ? [prisma.rolePermissionTemplate.createMany({ data: novos })] : []),
  ])
  return porChave.size
}
