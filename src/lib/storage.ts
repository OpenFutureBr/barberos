import prisma from "@/lib/prisma"

const ESTAB_ID = "estab001"

/**
 * Incrementa StorageUsage da organização vinculada ao estabelecimento.
 * Silencioso em caso de erro — não deve bloquear o upload principal.
 */
export async function registrarUpload(fileSizeBytes: number) {
  try {
    const estab = await prisma.establishment.findUnique({
      where: { id: ESTAB_ID },
      select: { organizationId: true },
    })
    if (!estab?.organizationId) return

    const sizeMb = fileSizeBytes / (1024 * 1024)

    await prisma.storageUsage.upsert({
      where: { organizationId: estab.organizationId },
      create: {
        organizationId: estab.organizationId,
        totalFiles: 1,
        totalSizeMb: sizeMb,
      },
      update: {
        totalFiles: { increment: 1 },
        totalSizeMb: { increment: sizeMb },
      },
    })
  } catch { /* silencioso */ }
}
