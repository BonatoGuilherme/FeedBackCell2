"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MotionConfig } from "motion/react";
import Navigation from "./Navigation";
import { useHasSession } from "@/src/lib/useSession";
import { hrefLogin } from "@/src/lib/rotas";

// telas de entrada: sem menu
const authPaths = ["/login", "/register"];
// o resto do site é aberto a visitantes; só estas rotas exigem conta
const protectedPrefixes = ["/items"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = authPaths.includes(pathname);
  const needsSession = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = useHasSession();

  useEffect(() => {
    if (needsSession && hasSession === false) {
      router.replace(hrefLogin(pathname));
    }
  }, [hasSession, needsSession, pathname, router]);

  if (isAuthPage) {
    return (
      <MotionConfig reducedMotion="user">
        <main>{children}</main>
      </MotionConfig>
    );
  }

  if (needsSession && hasSession !== true) {
    return (
      <main className="app-loading-screen">
        <div className="app-loading-screen__card" role="status" aria-live="polite">
          <span className="brand-sign brand-sign--lg" aria-hidden="true">
            FeedBack<span>CELL</span>
          </span>
          <span className="app-loading-screen__status">
            <span className="app-loading-screen__spinner" aria-hidden="true" />
            Verificando sua sessão…
          </span>
        </div>
      </main>
    );
  }

  // reducedMotion="user": com prefers-reduced-motion as animações do motion viram só fade
  return (
    <MotionConfig reducedMotion="user">
      <Navigation />
      <main className="main-content">{children}</main>
      <footer className="app-footer">
        <div className="app-footer__inner">
          <span className="app-footer__warn">Projeto de demonstração: não use dados reais.</span>
          <span>FeedBackCELL · nomes de aparelhos são marcas dos fabricantes</span>
        </div>
      </footer>
    </MotionConfig>
  );
}
