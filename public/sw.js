// Service worker do BarberOS.
//
// Existe para o app ser instalavel e para mostrar uma tela amigavel sem
// internet. NAO guarda nada em cache de proposito: dados de agenda, caixa e
// estoque velhos na tela sao piores que um aviso de "sem conexao" — e cache
// antigo ja deu trabalho antes (ver src/lib/clearPwaCache.ts).

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

const OFFLINE = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem conexão — BarberOS</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#0c0c0e;color:#e4e4e7;font-family:system-ui,sans-serif;text-align:center;padding:24px}
  h1{font-size:18px;margin:16px 0 8px} p{color:#a1a1aa;font-size:14px;margin:0 0 24px}
  .logo{width:56px;height:56px;border-radius:14px;background:#c9a84c;color:#0c0c0e;
    font-weight:800;font-size:28px;display:flex;align-items:center;justify-content:center;margin:0 auto}
  button{background:#c9a84c;color:#0c0c0e;border:0;border-radius:8px;padding:10px 20px;
    font-weight:600;font-size:14px}
</style></head>
<body><div>
  <div class="logo">B</div>
  <h1>Sem conexão com a internet</h1>
  <p>Confira o Wi-Fi ou os dados móveis e tente de novo.</p>
  <button onclick="location.reload()">Tentar de novo</button>
</div></body></html>`

// So as navegacoes (abrir uma tela) passam por aqui; APIs, imagens e scripts
// seguem direto pra rede sem intermediario.
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return
  e.respondWith(
    fetch(e.request).catch(() =>
      new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  )
})
