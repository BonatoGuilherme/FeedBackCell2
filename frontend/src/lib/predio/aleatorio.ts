/**
 * Sorteios com semente fixa: o cenário do prédio sai igual em toda visita,
 * no servidor e no navegador (sem divergir na hidratação). Math.random()
 * fica só para efeitos passageiros (estrela cadente, glitch, chuva).
 * Mesmo gerador (mulberry32) do hero da cidade (feat/hero-cidade).
 */

export type Sorteio = () => number;

/** Gerador pequeno e rápido; devolve números em [0, 1). */
export function criarSorteio(semente: number): Sorteio {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número real em [min, max). */
export const entre = (s: Sorteio, min: number, max: number) => min + s() * (max - min);

/** Inteiro em [min, max]. */
export const inteiro = (s: Sorteio, min: number, max: number) => min + Math.floor(s() * (max - min + 1));
