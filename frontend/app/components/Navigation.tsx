"use client";

/**
 * Navegação no estilo "Letreiro":
 * - barra de topo fixa com a marca FeedBack[CELL], os links (sublinhado verde-limão
 *   no item ativo) e o botão de entrar ou sair;
 * - no celular, os links vão para uma barra de abas fixa embaixo.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, LogIn, LogOut, Plus } from "lucide-react";
import { expireSession } from "@/src/lib/session";
import { useHasSession } from "@/src/lib/useSession";
import { hrefLogin, hrefProtegido } from "@/src/lib/rotas";

type Item = { href: string; label: string; short?: string; icon: typeof Home; exigeConta?: boolean };

const links: Item[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/catalog", label: "Catálogo", icon: LayoutGrid },
  { href: "/items/new", label: "Adicionar celular", short: "Adicionar", icon: Plus, exigeConta: true },
];

function activeHref(pathname: string) {
  // /catalogo também ativa o item "Catálogo" (/catalog redireciona para lá)
  const match = links
    .filter((l) => pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeHref(pathname);
  const logado = useHasSession();
  // visitante: ações que exigem conta levam ao login e voltam para cá depois
  const destino = (l: Item) => (l.exigeConta ? hrefProtegido(l.href, logado) : l.href);
  const hrefEntrar = hrefLogin(pathname);

  function handleLogout() {
    expireSession();
    router.replace("/");
  }

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar__inner">
          <Link href="/" className="brand-sign" aria-label="FeedBackCELL, início">
            FeedBack<span>CELL</span>
          </Link>

          <nav className="app-topbar__nav" aria-label="Navegação principal">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={destino(l)}
                    className="app-topbar__link"
                    aria-current={active === l.href ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="app-topbar__actions">
            {logado === true && (
              <button type="button" className="app-topbar__session" onClick={handleLogout}>
                <LogOut className="size-[18px]" strokeWidth={2.2} aria-hidden />
                Sair
              </button>
            )}
            {logado === false && (
              <Link href={hrefEntrar} className="app-topbar__session">
                <LogIn className="size-[18px]" strokeWidth={2.2} aria-hidden />
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* abas (celular) */}
      <nav className="app-tabs" aria-label="Navegação principal">
        <ul className="app-tabs__list">
          {links.map((l) => {
            const { href, label, short, icon: Icon } = l;
            return (
              <li key={href}>
                <Link
                  href={destino(l)}
                  className="app-tabs__link"
                  aria-current={active === href ? "page" : undefined}
                >
                  <Icon className="size-5" strokeWidth={2} aria-hidden />
                  <span>{short ?? label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
