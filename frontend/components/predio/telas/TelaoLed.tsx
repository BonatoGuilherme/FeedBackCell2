"use client";

/**
 * Telão de LED do telhado (seção 7.2): moldura de metal com parafusos e
 * ventilação, selo "● NO AR", pontos de LED e scanlines por cima do texto
 * (CSS), efeito de ligar ao abrir a página e um glitch curto a cada 12 a 20 s.
 *
 * O texto (h1) chega pronto do servidor como `children`; este componente só
 * liga e desliga o atributo data-glitch. O glitch fica desligado com
 * prefers-reduced-motion, com a aba oculta e com o telão fora da tela.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

function useGlitch(alvo: React.RefObject<HTMLElement | null>, ligado: boolean) {
  const [ativo, setAtivo] = useState(false);
  useEffect(() => {
    const el = alvo.current;
    if (!ligado || !el) return;
    let visivel = true;
    const observador = new IntersectionObserver(([e]) => (visivel = e.isIntersecting));
    observador.observe(el);
    let espera: ReturnType<typeof setTimeout>;
    let fim: ReturnType<typeof setTimeout>;
    const agendar = () => {
      espera = setTimeout(
        () => {
          if (visivel && !document.hidden) {
            setAtivo(true);
            fim = setTimeout(() => setAtivo(false), 150 + Math.random() * 150);
          }
          agendar();
        },
        12000 + Math.random() * 8000,
      );
    };
    agendar();
    return () => {
      observador.disconnect();
      clearTimeout(espera);
      clearTimeout(fim);
    };
  }, [alvo, ligado]);
  return ativo;
}

export function TelaoLed({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const parado = useReducedMotion();
  const glitch = useGlitch(ref, !parado);

  return (
    <div ref={ref} className="telao-led" data-glitch={glitch || undefined}>
      {["ne", "no", "se", "so"].map((canto) => (
        <span key={canto} className={`telao-led__parafuso telao-led__parafuso--${canto}`} aria-hidden="true" />
      ))}
      <span className="telao-led__selo">
        <span className="telao-led__bolinha" aria-hidden="true">
          ●
        </span>{" "}
        NO AR
      </span>
      <div className="telao-led__tela">
        {children}
        <span className="telao-led__ruido" aria-hidden="true" />
        <span className="telao-led__ligar" aria-hidden="true" />
      </div>
      <div className="telao-led__rodape" aria-hidden="true">
        <span className="telao-led__ventilacao" />
        <span className="telao-led__etiqueta" title="sinal OK">
          <span className="telao-led__jp">電波</span> OK
        </span>
      </div>
    </div>
  );
}
