"use client";

import { useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
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
    if (!isPublicPage && hasSession === false) {
      router.replace("/login");
    }
  }, [hasSession, isPublicPage, pathname, router]);

  if (isPublicPage) {
    return <main>{children}</main>;
  }

  if (hasSession !== true) {
    return (
      <main className="app-loading-screen">
        <div className="app-loading-screen__card" role="status" aria-live="polite">
          <span className="app-loading-screen__mark" aria-hidden="true">
            <Image src="/icons8-celular-100.png" alt="" width={22} height={22} unoptimized priority />
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
