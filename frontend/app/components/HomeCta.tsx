"use client";

/** Faixa rosa de fechamento da página inicial, com a placa vertical "開発中" (em desenvolvimento). */

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useHasSession } from "@/src/lib/useSession";
import { hrefProtegido } from "@/src/lib/rotas";

export default function HomeCta() {
  const logado = useHasSession();
  return (
    <section className="close-sec" aria-labelledby="home-cta-title">
      <div className="close-sec__vjp" aria-hidden>
        開発中
      </div>
      <div className="page-shell">
        <h2 id="home-cta-title" className="close-sec__title">
          Usa um desses? Conte o que achou
        </h2>
        <div className="btns">
          <Link className="btn-sign btn-sign--primary" href="/catalogo">
            Ver o catálogo
            <ArrowRight className="size-6" strokeWidth={2.4} aria-hidden />
          </Link>
          <Link className="btn-sign" href={hrefProtegido("/items/new", logado)}>
            <Plus className="size-6" strokeWidth={2.4} aria-hidden />
            Adicionar celular
          </Link>
        </div>
      </div>
    </section>
  );
}
