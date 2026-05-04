'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: '🏠 Home' },
    { href: '/catalog', label: '📚 Catálogo' },
    { href: '/items/new', label: '➕ Novo Item' },
    { href: '/login', label: '🔐 Login' },
    { href: '/register', label: '📝 Registrar' },
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          🔗 FeedBackCELL
        </Link>
        <ul className="nav-menu">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`nav-link ${pathname === link.href ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
