/**
 * Ruído para os desenhos do prédio: value noise 2D com tabela embaralhada
 * pela semente e fBm (soma de oitavas). Devolve valores em [0, 1].
 */

import { criarSorteio } from "./aleatorio";

export type Ruido = {
  /** value noise suave em (x, y). */
  valor: (x: number, y: number) => number;
  /** fBm: oitavas somadas (frequência ×2,03 e amplitude ×0,5 a cada uma). */
  fbm: (x: number, y: number, oitavas?: number) => number;
};

const suavizar = (t: number) => t * t * (3 - 2 * t);

export function criarRuido(semente: number): Ruido {
  const sorteio = criarSorteio(semente);
  const perm = new Uint8Array(512);
  const valores = new Float32Array(256);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  for (let i = 0; i < 256; i++) valores[i] = sorteio();

  const canto = (x: number, y: number) => valores[perm[(perm[x & 255] + y) & 511]];

  function valor(x: number, y: number) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = suavizar(x - xi);
    const fy = suavizar(y - yi);
    const a = canto(xi, yi);
    const b = canto(xi + 1, yi);
    const c = canto(xi, yi + 1);
    const d = canto(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  function fbm(x: number, y: number, oitavas = 4) {
    let soma = 0;
    let amplitude = 0.5;
    let total = 0;
    let f = 1;
    for (let o = 0; o < oitavas; o++) {
      soma += valor(x * f, y * f) * amplitude;
      total += amplitude;
      amplitude *= 0.5;
      f *= 2.03;
    }
    return soma / total;
  }

  return { valor, fbm };
}

/** smoothstep de GLSL: 0 antes de a, 1 depois de b (aceita a > b, invertido). */
export function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
