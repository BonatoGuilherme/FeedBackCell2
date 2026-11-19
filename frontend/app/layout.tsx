import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AuthLayout from "./components/AuthLayout";
import { AmbientBackground } from "@/components/ui/ambient-background";

// fontes dentro do repositório (app/fonts, subconjunto latin do Google Fonts):
// o build não depende de baixar nada da internet
const geistSans = localFont({
  src: "./fonts/Geist.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// serifa renascentista para títulos e números de destaque
const cormorant = localFont({
  src: [
    { path: "./fonts/CormorantGaramond.woff2", weight: "500 700", style: "normal" },
    { path: "./fonts/CormorantGaramond-Italic.woff2", weight: "500 700", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FeedBackCELL",
  description: "Plataforma de feedback e comentários",
  // ícones: app/icon.svg (aba) e app/apple-icon.png (tela inicial do iPhone)
};

export const viewport: Viewport = {
  themeColor: "#110c07",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable}`}
    >
      <body>
        {/* conexões antecipadas com o Sketchfab: o modelo 3D abre mais rápido */}
        <link rel="preconnect" href="https://sketchfab.com" />
        <link rel="preconnect" href="https://static.sketchfab.com" crossOrigin="" />
        <link rel="preconnect" href="https://media.sketchfab.com" crossOrigin="" />
        <AmbientBackground />
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
