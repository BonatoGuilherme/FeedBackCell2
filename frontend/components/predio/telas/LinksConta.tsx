"use client";

/**
 * Links que dependem da sessão: visitante vai ao login e volta para o destino
 * depois (como a barra do site faz). No servidor ainda não se sabe a sessão,
 * então o link sai como de visitante e se ajusta ao hidratar.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { useHasSession } from "@/src/lib/useSession";
import { hrefLogin, hrefProtegido } from "@/src/lib/rotas";

export function LinkAdicionar({ className, children }: { className?: string; children: ReactNode }) {
  const logado = useHasSession();
  return (
    <Link className={className} href={hrefProtegido("/items/new", logado)}>
      {children}
    </Link>
  );
}

/** "Entrar / Criar conta": só para visitante; volta para o prédio depois. */
export function LinkEntrar({ className }: { className?: string }) {
  const logado = useHasSession();
  if (logado !== false) return null;
  return (
    <Link className={className} href={hrefLogin("/predio")}>
      Entrar / Criar conta
    </Link>
  );
}
