"use client";

/**
 * Rolagem suave da página inteira com Lenis.
 * Quem pediu menos movimento no sistema (prefers-reduced-motion) fica com a
 * rolagem nativa; se a preferência mudar com a página aberta, o Lenis liga ou desliga.
 * Áreas com rolagem própria podem usar o atributo data-lenis-prevent.
 */

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;

    const aplicar = () => {
      if (media.matches) {
        lenis?.destroy();
        lenis = null;
      } else if (!lenis) {
        lenis = new Lenis({ autoRaf: true, lerp: 0.1, anchors: true });
      }
    };

    aplicar();
    media.addEventListener("change", aplicar);
    return () => {
      media.removeEventListener("change", aplicar);
      lenis?.destroy();
    };
  }, []);

  return null;
}
