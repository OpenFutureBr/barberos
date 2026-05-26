export async function clearPwaCache(): Promise<void> {
  // Limpa todos os caches do Cache Storage (PWA/service worker)
  if ("caches" in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map(k => caches.delete(k)))
  }

  // Desregistra service workers ativos
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(r => r.unregister()))
  }
}
