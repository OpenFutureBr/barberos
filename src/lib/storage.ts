import prisma from "@/lib/prisma"

/**
 * Incrementa StorageUsage da organização.
 * Passa estabId OU orgId diretamente.
 */
export async function registrarUpload(
  fileSizeBytes: number,
  estabId?: string | null,
  orgId?: string | null,
) {
  try {
    let resolvedOrgId = orgId ?? null

    if (!resolvedOrgId && estabId) {
      const estab = await prisma.establishment.findUnique({
        where: { id: estabId },
        select: { organizationId: true },
      })
      resolvedOrgId = estab?.organizationId ?? null
    }

    if (!resolvedOrgId) return

    const sizeMb = fileSizeBytes / (1024 * 1024)

    await prisma.storageUsage.upsert({
      where: { organizationId: resolvedOrgId },
      create: { organizationId: resolvedOrgId, totalFiles: 1, totalSizeMb: sizeMb },
      update: { totalFiles: { increment: 1 }, totalSizeMb: { increment: sizeMb } },
    })
  } catch { /* silencioso */ }
}
