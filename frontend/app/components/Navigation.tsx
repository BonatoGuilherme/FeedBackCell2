"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, X } from "lucide-react";
import { expireSession } from "@/src/lib/session";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Início" },
  { href: "/catalog", label: "Catálogo" },
  { href: "/comments", label: "Comentários" },
  { href: "/items/new", label: "Adicionar celular" },
];

const SPRING = { type: "spring" as const, bounce: 0, duration: 0.5 };

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
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
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
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/[0.05] bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-end px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="FeedBackCELL, início">
            <span className="grid size-10 place-items-center rounded-xl bg-[#eef0ff]">
              <Image src="/icons8-celular-100.png" alt="" width={24} height={24} unoptimized priority />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#0f1020]">
              FeedBack<span className="text-[#4c5cf5]">CELL</span>
            </span>
          </Link>
        </div>
      </header>

      {/* botão à esquerda, acima do painel, para virar "Fechar" */}
      <div className="fixed left-3 top-3 z-[60] sm:left-6">
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-principal"
          className={cn(
            "flex h-12 cursor-pointer items-center gap-3 rounded-xl px-4 text-lg font-bold transition-colors",
            open
              ? "border border-white/80 bg-transparent text-white hover:bg-white/10"
              : "bg-[#0b0b10] text-white hover:bg-black",
          )}
        >
          {open ? "Fechar" : "Menu"}
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={SPRING} className="grid">
            {open ? <X className="size-6" strokeWidth={1.8} /> : <Plus className="size-6" strokeWidth={1.8} />}
          </motion.span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className="modal-backdrop fixed inset-0 z-50 bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              key="panel"
              id="menu-principal"
              aria-label="Menu principal"
              className="fixed inset-y-0 left-0 z-[55] flex w-[86%] max-w-[400px] flex-col overflow-y-auto bg-[#18181b] pb-8 pt-20 rounded-r-3xl"
              initial={reduce ? { opacity: 0 } : { x: "-100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-100%" }}
              transition={SPRING}
            >
              <nav aria-label="Navegação principal">
                <ul>
                  {links.map((link, i) => (
                    <motion.li
                      key={link.href}
                      initial={reduce ? false : { opacity: 0, x: -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...SPRING, delay: reduce ? 0 : 0.08 + i * 0.05 }}
                    >
                      <Link
                        ref={i === 0 ? firstLinkRef : undefined}
                        href={link.href}
                        aria-current={isActive(link.href) ? "page" : undefined}
                        className={cn(
                          "block px-8 py-1 font-[family-name:var(--font-display)] text-[clamp(32px,6vw,48px)] uppercase leading-[1.12] tracking-tight transition-colors duration-150 outline-none sm:px-10",
                          "text-[#f4f4f5] hover:bg-[#e5e5e7] hover:text-[#18181b] focus-visible:bg-[#e5e5e7] focus-visible:text-[#18181b]",
                          isActive(link.href) && "text-[#9aa6ff]",
                        )}
                      >
                        {link.label}
                      </Link>
                    </motion.li>
                  ))}
                  <motion.li
                    initial={reduce ? false : { opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...SPRING, delay: reduce ? 0 : 0.08 + links.length * 0.05 }}
                  >
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full cursor-pointer px-8 py-1 text-left font-[family-name:var(--font-display)] text-[clamp(32px,6vw,48px)] uppercase leading-[1.12] tracking-tight text-[#f87171] outline-none transition-colors duration-150 hover:bg-[#e5e5e7] hover:text-[#18181b] focus-visible:bg-[#e5e5e7] focus-visible:text-[#18181b] sm:px-10"
                    >
                      Sair
                    </button>
                  </motion.li>
                </ul>
              </nav>
              <p className="mt-auto px-8 pt-10 text-sm text-white/40 sm:px-10">
                FeedBackCELL · celulares, fotos e opiniões
              </p>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
