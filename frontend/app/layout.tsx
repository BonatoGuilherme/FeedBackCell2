import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";
import AuthLayout from "./components/AuthLayout";
import { SmoothScroll } from "@/components/ui/smooth-scroll";

// fontes dentro do repositório (app/fonts, subconjunto latin do Google Fonts):
// o build não depende de baixar nada da internet
const archivo = localFont({
  src: "./fonts/Archivo.woff2",
  variable: "--font-archivo",
  weight: "400 700",
  display: "swap",
});

// condensada dos letreiros: títulos, botões e números
const shoulders = localFont({
  src: "./fonts/BigShouldersDisplay.woff2",
  variable: "--font-shoulders",
  weight: "700 900",
  display: "swap",
});

// Dela Gothic One só com os caracteres japoneses das placas (subconjunto de ~6 KB)
const dela = localFont({
  src: "./fonts/DelaGothicOne-letreiro.woff2",
  variable: "--font-dela",
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "FeedBackCELL",
  description: "Catálogo de celulares com fichas técnicas, fotos e avaliações",
  // ícones: app/icon.svg (aba) e app/apple-icon.png (tela inicial do iPhone)
};

export const viewport: Viewport = {
  themeColor: "#1c1550",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // a CSP usa nonce por requisição (proxy.ts): ler os cabeçalhos torna a
  // renderização dinâmica, senão o HTML pré-gerado sairia sem o nonce
  await headers();
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${shoulders.variable} ${dela.variable}`}>
      <body>
        {/* conexão antecipada com o Sketchfab: a aba "Modelo 3D" do detalhe abre mais rápido */}
        <link rel="preconnect" href="https://sketchfab.com" />
        <SmoothScroll />
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
