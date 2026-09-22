import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import { SCRIPT_TEMA_BOOT } from "@/lib/tema"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "BarberOS — Sistema de Gestão Inteligente",
  description: "Plataforma SaaS para gestão de barbearias e salões",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BarberOS",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  // Casa com --surface-1 do tema escuro (padrao) para a barra de status do PWA
  // encostar no shell em vez de aparecer uma faixa dourada. O aplicarTema()
  // reescreve esta meta quando o usuario troca de modo.
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  // SEM maximumScale: travar em 1 mata o pinch-zoom (WCAG 1.4.4). Ele estava
  // ali so pra evitar o zoom automatico do iOS ao focar um campo pequeno —
  // problema que o globals.css resolve na origem, subindo os campos pra 16px
  // em ponteiro grosso.
  viewportFit: "cover",
  // Faz o navegador redimensionar a área de conteúdo (viewport visual) quando
  // a barra de endereço/opções ou o teclado aparecem, em vez de sobrepor por
  // cima — sem isso, elementos "fixed" no rodapé ficam calculados contra uma
  // altura maior que a área realmente visível e somem atrás da barra do navegador.
  interactiveWidget: "resizes-content",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/*
          Scripts que precisam rodar ANTES do primeiro paint (tema e fonte
          salvos no localStorage), como <script> cru no <head> — o navegador
          executa na hora em que faz o parse.

          NAO troque por next/script com strategy="beforeInteractive": no build
          de producao aquele componente nao emite um <script> executavel, e sim
          um `(self.__next_s=self.__next_s||[]).push([...])`, uma fila que o
          runtime do Next so processa depois da hidratacao. Em dev funciona
          (o script sai inline), entao o estrago aparece so em producao: o
          <html> fica sem os data-mode/data-accent/data-tone e a pagina pinta
          no tema errado. Verificado em `next build && next start`.
        */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: `document.addEventListener('contextmenu',function(e){e.preventDefault()});document.addEventListener('keydown',function(e){if(e.key==='F12'){e.preventDefault();e.stopPropagation();}});` }} />
        <script dangerouslySetInnerHTML={{ __html: `try{var _f=localStorage.getItem("fonte");if(_f){var _fd=JSON.parse(_f);document.documentElement.style.setProperty("--font-override",_fd.family);if(_fd.url){var _fl=document.createElement("link");_fl.rel="stylesheet";_fl.href=_fd.url;document.head.appendChild(_fl);}}}catch(e){}` }} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BarberOS" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}