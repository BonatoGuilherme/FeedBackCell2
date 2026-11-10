import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthLayout from "./components/AuthLayout";
import { AmbientBackground } from "@/components/ui/ambient-background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// serifa renascentista para títulos e números de destaque
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
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
