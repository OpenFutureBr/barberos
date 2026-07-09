import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = "logos"

// Service-role client — server-side only, never import in client components
export function getStorageClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
}

let bucketReady = false

async function ensureBucket() {
  if (bucketReady) return
  const client = getStorageClient()
  const { data: buckets } = await client.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    await client.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 })
  }
  bucketReady = true
}

/**
 * Upload a logo buffer to Supabase Storage.
 * path examples: "org/org001.webp", "unit/cm123abc.webp"
 * Returns the public URL.
 *
 * cacheControl de 1 ano: a maioria das fotos não muda depois de enviada, e
 * quem consome essa URL (frontend) deve anexar `?v=<updatedAt>` na hora de
 * exibir a imagem — isso muda a URL sempre que o registro é atualizado,
 * então o navegador busca a versão nova em vez de servir a antiga do cache,
 * sem precisar de um cache curto (que forçava recarregar a imagem toda hora
 * mesmo quando ela não tinha mudado).
 */
export async function uploadLogo(storagePath: string, buffer: Buffer, contentType: string): Promise<string> {
  await ensureBucket()
  const client = getStorageClient()

  const { error } = await client.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true, cacheControl: "31536000" })

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`)

  const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

/**
 * Delete a logo from Supabase Storage.
 * Silently ignores errors (file may not exist).
 */
export async function deleteLogo(storagePath: string): Promise<void> {
  try {
    const client = getStorageClient()
    await client.storage.from(BUCKET).remove([storagePath])
  } catch { /* silencioso */ }
}

/** Derive storage path from a public URL previously saved by uploadLogo */
export function urlToStoragePath(url: string): string | null {
  try {
    const u = new URL(url)
    // e.g. /storage/v1/object/public/logos/org/org001.webp
    const parts = u.pathname.split(`/object/public/${BUCKET}/`)
    return parts.length > 1 ? parts[1] : null
  } catch { return null }
}

export function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", svg: "image/svg+xml",
  }
  return map[ext] ?? "application/octet-stream"
}
