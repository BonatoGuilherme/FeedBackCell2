"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AppIcon from "./AppIcon";
import { notifySessionChange } from "@/src/lib/session";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/", label: "Visão geral", icon: "home" as const },
    { href: "/catalog", label: "Catálogo", icon: "catalog" as const },
    { href: "/comments", label: "Comentários", icon: "catalog" as const },
    { href: "/items/new", label: "Adicionar celular", icon: "plus" as const },
  ];

  function handleLogout() {
    window.localStorage.removeItem("token");
    notifySessionChange();
    router.replace("/login");
  }

  return (
    <aside className="app-sidebar">
      <Link href="/" className="app-brand" aria-label="FeedBackCELL, visão geral">
        <span className="app-brand__mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="app-brand__name">
          FeedBack<span>CELL</span>
        </span>
      </Link>

      <div className="sidebar-section-label">Navegação</div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <AppIcon name={link.icon} size={19} />
              <span>{link.label}</span>
              {link.href === "/items/new" && (
                <AppIcon name="arrow" size={15} />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-account">
          <span className="sidebar-account__avatar" aria-hidden="true">
            F
          </span>
          <span className="sidebar-account__copy">
            <strong>FeedBackCELL</strong>
            <span>Área de trabalho</span>
          </span>
        </div>
        <button className="sidebar-logout" type="button" onClick={handleLogout}>
          <AppIcon name="logout" size={18} />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
}
