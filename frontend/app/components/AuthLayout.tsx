"use client";

import { useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import Navigation from "./Navigation";
import { useHasSession } from "@/src/lib/useSession";
import { hrefLogin } from "@/src/lib/rotas";
import { sessaoExpirou } from "@/src/lib/session";

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
      // token vencido ou 401 de alguma chamada: o login avisa que a sessão expirou
      router.replace(hrefLogin(pathname, "login", { expirou: sessaoExpirou() }));
    }
  }, [hasSession, needsSession, pathname, router]);

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  if (needsSession && hasSession !== true) {
    return (
      <main className="app-loading-screen">
        <div className="app-loading-screen__card" role="status" aria-live="polite">
          <span className="app-loading-screen__mark" aria-hidden="true">
            <Image src="/brand-mark.svg" alt="" width={44} height={44} unoptimized priority />
          </span>
          <span className="app-loading-screen__name" aria-hidden="true">
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

  return (
    <>
      <Navigation />
      <main className="main-content">{children}</main>
    </>
  );
}
