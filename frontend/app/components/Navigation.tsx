"use client";

/**
 * Navegação em formato de painel:
 * - desktop: menu lateral fino só com ícones (rótulo aparece ao passar o mouse)
 *   e barra de topo com o caminho da página e as ações;
 * - celular: barra de topo compacta e barra de abas fixa embaixo.
 * O item ativo é marcado por uma pílula que "estica" (useSlidePill, com GSAP).
 */

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, LogOut, MessageSquare, Plus } from "lucide-react";
import { expireSession } from "@/src/lib/session";
import { useSlidePill } from "@/components/ui/use-slide-pill";

const links = [
  { href: "/", label: "Início", icon: Home },
  { href: "/catalog", label: "Catálogo", icon: LayoutGrid },
  { href: "/comments", label: "Comentários", icon: MessageSquare },
  { href: "/items/new", label: "Adicionar celular", short: "Adicionar", icon: Plus },
];

const titles: Record<string, string> = {
  "/": "Painel",
  "/catalog": "Catálogo",
  "/comments": "Comentários",
  "/items/new": "Novo celular",
};

function activeHref(pathname: string) {
  const match = links
    .filter((l) => pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeHref(pathname);

  const railRef = useRef<HTMLUListElement>(null);
  const railPill = useRef<HTMLSpanElement>(null);
  const tabsRef = useRef<HTMLUListElement>(null);
  const tabsPill = useRef<HTMLSpanElement>(null);
  useSlidePill(railRef, railPill, active, "y");
  useSlidePill(tabsRef, tabsPill, active, "x");

  function handleLogout() {
    expireSession();
    router.replace("/login");
  }

  const title = titles[active ?? ""] ?? "FeedBackCELL";

  return (
    <>
      {/* menu lateral (desktop) */}
      <aside className="app-rail" aria-label="Navegação principal">
        <Link href="/" className="app-rail__brand" aria-label="FeedBackCELL, início">
          <Image src="/brand-mark.svg" alt="" width={44} height={44} unoptimized priority />
        </Link>

        <nav className="app-rail__nav">
          <ul ref={railRef} className="app-rail__list">
            <span ref={railPill} className="app-pill" aria-hidden />
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  data-pill-key={href}
                  className="app-rail__link"
                  aria-current={active === href ? "page" : undefined}
                  aria-label={label}
                >
                  <Icon className="size-[19px]" strokeWidth={1.7} aria-hidden />
                  <span className="app-rail__tip" role="tooltip">
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button type="button" className="app-rail__link app-rail__logout" onClick={handleLogout} aria-label="Sair">
          <LogOut className="size-[18px]" strokeWidth={1.7} aria-hidden />
          <span className="app-rail__tip" role="tooltip">
            Sair
          </span>
        </button>
      </aside>

      {/* barra de topo */}
      <header className="app-topbar">
        <Link href="/" className="app-topbar__brand" aria-label="FeedBackCELL, início">
          <span className="app-topbar__mark">
            <Image src="/brand-mark.svg" alt="" width={30} height={30} unoptimized priority />
          </span>
          <span>
            FeedBack<em>CELL</em>
          </span>
        </Link>

        <nav className="app-crumbs" aria-label="Você está em">
          <span>FeedBackCELL</span>
          <span aria-hidden>/</span>
          <span aria-current="page">{title}</span>
        </nav>

        <div className="app-topbar__actions">
          <span className="app-live" title="Catálogo sincronizado">
            <i aria-hidden />
            Ao vivo
          </span>
          <Link href="/items/new" className="button button--primary button--sm app-topbar__new">
            <Plus className="size-4" aria-hidden />
            Novo
          </Link>
          <button type="button" className="app-topbar__logout" onClick={handleLogout} aria-label="Sair">
            <LogOut className="size-[17px]" strokeWidth={1.7} aria-hidden />
          </button>
        </div>
      </header>

      {/* abas (celular) */}
      <nav className="app-tabs" aria-label="Navegação principal">
        <ul ref={tabsRef} className="app-tabs__list">
          <span ref={tabsPill} className="app-pill" aria-hidden />
          {links.map(({ href, label, short, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                data-pill-key={href}
                className="app-tabs__link"
                aria-current={active === href ? "page" : undefined}
              >
                <Icon className="size-5" strokeWidth={1.7} aria-hidden />
                <span>{short ?? label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
