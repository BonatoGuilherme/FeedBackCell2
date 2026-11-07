"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navigation from "./Navigation";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeToSession,
} from "@/src/lib/session";

const publicPaths = ["/login", "/register"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = publicPaths.includes(pathname);
  const hasSession = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  useEffect(() => {
    if (!isPublicPage && !hasSession) {
      router.replace("/login");
    }
  }, [hasSession, isPublicPage, pathname, router]);

  if (isPublicPage) {
    return <main className="auth-main">{children}</main>;
  }

  if (hasSession !== true) {
    return (
      <main className="app-loading-screen" role="status">
        <span className="app-loading-screen__mark" aria-hidden="true">
          F
        </span>
        <span>Verificando sessão…</span>
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
