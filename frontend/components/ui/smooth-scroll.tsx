"use client";

/**
 * Rolagem suave da página inteira com Lenis.
 * Quem pediu menos movimento no sistema (prefers-reduced-motion) fica com a
 * rolagem nativa; se a preferência mudar com a página aberta, o Lenis liga ou desliga.
 * Áreas com rolagem própria podem usar o atributo data-lenis-prevent.
 * O Lenis só é baixado depois da hidratação (fora do JS inicial) e nem é baixado
 * por quem usa movimento reduzido.
 */

import { useEffect } from "react";
import type Lenis from "lenis";
import "lenis/dist/lenis.css";

export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let ativo = true;

    const aplicar = async () => {
      if (media.matches) {
        lenis?.destroy();
        lenis = null;
        return;
      }
      if (lenis) return;
      const { default: LenisClasse } = await import("lenis");
      // a página pode ter sido fechada, ou a preferência mudado, durante o download
      if (!ativo || media.matches || lenis) return;
      lenis = new LenisClasse({ autoRaf: true, lerp: 0.1, anchors: true });
    };

    void aplicar();
    media.addEventListener("change", aplicar);
    return () => {
      ativo = false;
      media.removeEventListener("change", aplicar);
      lenis?.destroy();
    };
  }, []);

  return null;
}
