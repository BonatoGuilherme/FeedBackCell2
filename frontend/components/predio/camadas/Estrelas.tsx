"use client";

/**
 * Céu estrelado do topo: ~250 estrelas paradas num canvas (semente fixa),
 * 12 que cintilam (spans com CSS, fases diferentes) e uma estrela cadente a
 * cada 8 a 14 s. Com prefers-reduced-motion nada se mexe.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { criarSorteio, entre } from "@/src/lib/predio/aleatorio";

const SEMENTE_ESTRELAS = 4041;

type Estrela = { x: number; y: number; r: number; a: number; cruz: boolean };

function gerar(): { paradas: Estrela[]; cintilantes: (Estrela & { dur: number; atraso: number })[] } {
  const s = criarSorteio(SEMENTE_ESTRELAS);
  const paradas = Array.from({ length: 250 }, () => ({
    x: s(),
    // mais estrelas no alto: perto do telhado a névoa e a luz da cidade apagam o céu
    y: s() ** 1.4,
    r: entre(s, 0.5, 1),
    a: entre(s, 0.25, 0.9),
    cruz: s() < 0.012,
  }));
  const cintilantes = Array.from({ length: 12 }, () => ({
    x: entre(s, 0.03, 0.97),
    y: entre(s, 0.02, 0.6),
    r: entre(s, 1, 1.6),
    a: 1,
    cruz: false,
    dur: entre(s, 3, 7),
    atraso: -entre(s, 0, 7),
  }));
  return { paradas, cintilantes };
}

const { paradas, cintilantes } = gerar();

function desenhar(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  for (const e of paradas) {
    const x = e.x * width;
    const y = e.y * height;
    ctx.fillStyle = `rgba(255,246,224,${e.a})`;
    ctx.beginPath();
    ctx.arc(x, y, e.r, 0, Math.PI * 2);
    ctx.fill();
    if (e.cruz) {
      // brilho em cruz das estrelas mais fortes
      ctx.strokeStyle = "rgba(255,246,224,0.55)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
    }
  }
}

/** Estrela cadente: posição e intervalo sorteados na hora (efeito passageiro). */
function useEstrelaCadente(ligada: boolean) {
  const [voo, setVoo] = useState<{ chave: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!ligada) return;
    let id: ReturnType<typeof setTimeout>;
    const agendar = () => {
      id = setTimeout(
        () => {
          if (!document.hidden) setVoo({ chave: Date.now(), x: 20 + Math.random() * 60, y: 4 + Math.random() * 26 });
          agendar();
        },
        8000 + Math.random() * 6000,
      );
    };
    agendar();
    return () => clearTimeout(id);
  }, [ligada]);
  return voo;
}

export function Estrelas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parado = useReducedMotion();
  const voo = useEstrelaCadente(!parado);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    desenhar(el);
    // redesenha só quando a largura muda (barra do navegador do celular mexe só na altura)
    let largura = el.getBoundingClientRect().width;
    let espera: ReturnType<typeof setTimeout>;
    const observador = new ResizeObserver(([entrada]) => {
      if (Math.abs(entrada.contentRect.width - largura) < 1) return;
      largura = entrada.contentRect.width;
      clearTimeout(espera);
      espera = setTimeout(() => desenhar(el), 150);
    });
    observador.observe(el);
    return () => {
      observador.disconnect();
      clearTimeout(espera);
    };
  }, []);

  return (
    <div className="estrelas">
      <canvas ref={canvas} className="estrelas__canvas" />
      {cintilantes.map((e, i) => (
        <span
          key={i}
          className="estrelas__cintila"
          style={{
            left: `${(e.x * 100).toFixed(2)}%`,
            top: `${(e.y * 100).toFixed(2)}%`,
            width: `${(e.r * 2).toFixed(1)}px`,
            height: `${(e.r * 2).toFixed(1)}px`,
            animationDuration: `${e.dur.toFixed(2)}s`,
            animationDelay: `${e.atraso.toFixed(2)}s`,
          }}
        />
      ))}
      {voo && (
        <span
          key={voo.chave}
          className="estrelas__cadente"
          style={{ left: `${voo.x}%`, top: `${voo.y}%` }}
        />
      )}
    </div>
  );
}
