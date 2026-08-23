// Ícones monocromáticos no estilo já usado na barra lateral e nas abas do
// app (traço fino, currentColor, sem preenchimento colorido) — nunca emoji.

export function IconLista() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h12M1 7h12M1 11h12" />
    </svg>
  )
}

export function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="5" height="5" rx="0.5" />
      <rect x="8" y="1" width="5" height="5" rx="0.5" />
      <rect x="1" y="8" width="5" height="5" rx="0.5" />
      <rect x="8" y="8" width="5" height="5" rx="0.5" />
    </svg>
  )
}

export function IconGrafico() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 13V1M1 13h12" />
      <path d="M4 10V7M7.5 10V4M11 10V6" />
    </svg>
  )
}

export function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1v8M3.5 6.5L7 10l3.5-3.5" />
      <path d="M1 11.5v1A1.5 1.5 0 002.5 14h9a1.5 1.5 0 001.5-1.5v-1" />
    </svg>
  )
}

