/**
 * Display de 7 segmentos (SVG simples) para o andar do elevador.
 * Segmentos: a topo, b direita alta, c direita baixa, d base, e esquerda baixa,
 * f esquerda alta, g meio. Os apagados ficam visíveis em tom escuro, como num painel real.
 */

import type { NumeroAndar } from "@/src/lib/predio/andares";

type Segmento = "a" | "b" | "c" | "d" | "e" | "f" | "g";

const ACESOS: Record<NumeroAndar, Segmento[]> = {
  R: ["e", "g"], // "r" minúsculo
  "5": ["a", "f", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "3": ["a", "b", "g", "c", "d"],
  "2": ["a", "b", "g", "e", "d"],
  "1": ["b", "c"],
  T: ["f", "e", "d", "g"], // "t" minúsculo
};

// caixa 40x70; segmentos horizontais 24x6, verticais 6x26
const FORMAS: Record<Segmento, string> = {
  a: "M10 3h20l-3 6H13z",
  g: "M10 35l3-3h14l3 3-3 3H13z",
  d: "M10 67h20l-3-6H13z",
  f: "M7 6l6 6v18l-3 3-3-3z",
  b: "M33 6l-6 6v18l3 3 3-3z",
  e: "M7 40l3-3 3 3v18l-6 6z",
  c: "M33 40l-3-3-3 3v18l6 6z",
};

export function DisplaySeteSegmentos({ numero, className }: { numero: NumeroAndar; className?: string }) {
  const acesos = ACESOS[numero];
  return (
    <svg className={className} viewBox="0 0 40 70" aria-hidden="true" focusable="false">
      {(Object.keys(FORMAS) as Segmento[]).map((s) => (
        <path key={s} d={FORMAS[s]} className={acesos.includes(s) ? "segmento segmento--aceso" : "segmento"} />
      ))}
    </svg>
  );
}
