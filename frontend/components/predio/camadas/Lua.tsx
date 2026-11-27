"use client";

/**
 * Lua pintada do topo, cortada pela borda de cima. Até o desenho terminar
 * (src/lib/predio/desenharLua.ts, ~1 s em fatias) aparece um círculo
 * pêssego; depois o canvas entra com fade de 400 ms. Desenha uma vez, só
 * depois do primeiro paint, e não redesenha no resize (o CSS escala).
 * Se existir public/predio/lua.avif (arte real, seção 9), use `arte`.
 */

import { useEffect, useRef, useState } from "react";
import { desenharLua } from "@/src/lib/predio/desenharLua";
import { cn } from "@/lib/utils";

/** Teto do canvas: acima disso o ganho some (a lua é borrada de propósito) e o custo cresce. */
const LADO_MAXIMO = 1200;

type OciosoGlobal = typeof globalThis & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function Lua({ arte }: { arte?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    if (arte) return;
    const el = canvas.current;
    const div = caixa.current;
    if (!el || !div) return;
    const controle = new AbortController();
    const g = globalThis as OciosoGlobal;
    const comecar = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const lado = Math.min(LADO_MAXIMO, div.getBoundingClientRect().width * dpr);
      void desenharLua(el, lado, { sinal: controle.signal }).then((ok) => ok && setPronta(true));
    };
    // depois do primeiro paint: o h1 do telão (LCP) não espera a lua
    const id = g.requestIdleCallback ? g.requestIdleCallback(comecar, { timeout: 1200 }) : setTimeout(comecar, 300);
    return () => {
      controle.abort();
      if (g.cancelIdleCallback) g.cancelIdleCallback(id as number);
      else clearTimeout(id);
    };
  }, [arte]);

  return (
    <div ref={caixa} className={cn("lua", (pronta || arte) && "lua--pronta")}>
      <div className="lua__esboco" />
      {arte ? (
        // eslint-disable-next-line @next/next/no-img-element -- arte opcional, decorativa
        <img className="lua__desenho" src={arte} alt="" />
      ) : (
        <canvas ref={canvas} className="lua__desenho" />
      )}
    </div>
  );
}
