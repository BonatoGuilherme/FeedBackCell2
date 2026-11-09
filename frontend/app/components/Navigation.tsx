"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Home, LayoutGrid, LogOut, Menu, MessageSquare, Plus, X } from "lucide-react";
import { expireSession } from "@/src/lib/session";

const links = [
  { href: "/", label: "Início", icon: Home },
  { href: "/catalog", label: "Catálogo", icon: LayoutGrid },
  { href: "/comments", label: "Comentários", icon: MessageSquare },
];

const ADD_HREF = "/items/new";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // fecha ao trocar de página
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    // ao voltar para a largura de desktop o painel deixa de existir
    const desktop = window.matchMedia("(min-width: 861px)");
    const onResize = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  function handleLogout() {
    expireSession();
    router.replace("/login");
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/" className="site-brand" aria-label="FeedBackCELL, início">
            <span className="site-brand__mark">
              <Image src="/icons8-celular-100.png" alt="" width={20} height={20} unoptimized priority />
            </span>
            <span aria-hidden>
              FeedBack<strong>CELL</strong>
            </span>
          </Link>

          <nav className="site-nav" aria-label="Navegação principal">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="site-nav__link"
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="site-actions">
            <Link
              href={ADD_HREF}
              className="button button--primary button--sm"
              aria-current={isActive(ADD_HREF) ? "page" : undefined}
            >
              <Plus className="size-4" aria-hidden />
              Adicionar celular
            </Link>
            <button type="button" className="button button--text button--sm" onClick={handleLogout}>
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </div>

          <button
            ref={toggleRef}
            type="button"
            className="site-menu-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className="site-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              key="panel"
              id="menu-principal"
              className="site-mobile-panel"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            >
              <nav aria-label="Menu principal">
                <ul>
                  {[...links, { href: ADD_HREF, label: "Adicionar celular", icon: Plus }].map((link, i) => {
                    const Icon = link.icon;
                    return (
                      <li key={link.href}>
                        <Link
                          ref={i === 0 ? firstLinkRef : undefined}
                          href={link.href}
                          className="site-mobile-panel__link"
                          aria-current={isActive(link.href) ? "page" : undefined}
                        >
                          <Icon className="size-[18px]" aria-hidden />
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                  <li aria-hidden className="site-mobile-panel__divider" />
                  <li>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="site-mobile-panel__link site-mobile-panel__link--danger"
                    >
                      <LogOut className="size-[18px]" aria-hidden />
                      Sair
                    </button>
                  </li>
                </ul>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
