"use client";

/**
 * Fundo da aplicação no estilo sfumato de Leonardo da Vinci:
 * - manchas de luz desfocadas (ocre, azul-lápis, verdete, terra de Siena) que
 *   se movem devagar, como a névoa das pinturas;
 * - textura de papel envelhecido (ruído SVG);
 * - esboços em sépia (homem vitruviano geométrico, espiral áurea e uma
 *   engrenagem dos cadernos), quase transparentes;
 * - leve paralaxe com o mouse, desligada no toque e com prefers-reduced-motion.
 *
 * É decorativo: fica atrás de tudo e é ignorado por leitores de tela.
 */

import { useEffect, useRef } from "react";

export function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (reduce.matches || !fine.matches) return;

    let frame = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const tick = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="ambient" aria-hidden="true">
      <div className="ambient__glow ambient__glow--ochre" />
      <div className="ambient__glow ambient__glow--lapis" />
      <div className="ambient__glow ambient__glow--verdigris" />
      <div className="ambient__glow ambient__glow--sienna" />

      <svg className="ambient__sketch ambient__sketch--vitruvian" viewBox="0 0 400 400">
        <circle cx="200" cy="214" r="168" />
        <rect x="58" y="70" width="284" height="284" />
        <line x1="200" y1="46" x2="200" y2="382" />
        <line x1="32" y1="214" x2="368" y2="214" />
        <line x1="58" y1="70" x2="342" y2="354" />
        <line x1="342" y1="70" x2="58" y2="354" />
        <circle cx="200" cy="214" r="112" strokeDasharray="2 6" />
        <circle cx="200" cy="214" r="56" strokeDasharray="1 5" />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={200 + Math.cos(a) * 160}
              y1={214 + Math.sin(a) * 160}
              x2={200 + Math.cos(a) * 168}
              y2={214 + Math.sin(a) * 168}
            />
          );
        })}
      </svg>

      <svg className="ambient__sketch ambient__sketch--spiral" viewBox="0 0 610 377">
        <rect x="0.5" y="0.5" width="609" height="376" />
        <line x1="377" y1="0" x2="377" y2="377" />
        <line x1="377" y1="233" x2="610" y2="233" />
        <line x1="466" y1="233" x2="466" y2="377" />
        <line x1="377" y1="288" x2="466" y2="288" />
        <path d="M377 377 A377 377 0 0 1 0 0 M377 0 A233 233 0 0 1 610 233 M610 233 A144 144 0 0 1 466 377 M466 377 A89 89 0 0 1 377 288 M377 288 A55 55 0 0 1 432 233" />
      </svg>

      <svg className="ambient__sketch ambient__sketch--gear" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="62" />
        <circle cx="100" cy="100" r="18" />
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * 360;
          return (
            <rect
              key={i}
              x="94"
              y="24"
              width="12"
              height="16"
              transform={`rotate(${a} 100 100)`}
            />
          );
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * 18}
              y1={100 + Math.sin(a) * 18}
              x2={100 + Math.cos(a) * 62}
              y2={100 + Math.sin(a) * 62}
            />
          );
        })}
      </svg>

      <div className="ambient__grain" />
      <div className="ambient__vignette" />
    </div>
  );
}
