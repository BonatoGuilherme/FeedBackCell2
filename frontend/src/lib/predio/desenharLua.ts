/**
 * Lua pintada (seção 7.1 do prompt do prédio): esfera com terminador suave,
 * mares, crateras, borda de pincel seco, luz neon da cidade no limbo e
 * pinceladas por cima. Tudo com semente fixa: a lua sai sempre igual.
 *
 * Roda no main thread em fatias de ~10 ms (cede a vez entre elas), depois do
 * primeiro paint. Worker ficou de fora: a CSP com 'strict-dynamic' não
 * garante que um script de worker carregue em todos os navegadores.
 */

import { criarSorteio, entre } from "./aleatorio";
import { criarRuido, smoothstep } from "./ruido";

/** Semente escolhida a olho: mares bem distribuídos e uma cratera grande embaixo. */
export const SEMENTE_LUA = 20261127;

type Rgb = [number, number, number];

const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const misturar = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const COR = {
  luzA: hex("#e8aaa0"),
  luzB: hex("#ffe2cc"),
  mar: hex("#b08096"),
  sombraA: hex("#34266c"),
  sombraB: hex("#564296"),
  rosa: hex("#ff3c96"),
  lima: hex("#dcff2e"),
};

type Cratera = { u: number; v: number; r: number };

const ceder = () => new Promise<void>((ok) => setTimeout(ok, 0));

function abortou(sinal?: AbortSignal) {
  return sinal?.aborted ?? false;
}

/**
 * Desenha a lua no canvas `destino` com `tamanho` × `tamanho` pixels.
 * Resolve quando termina; para no meio se o `sinal` for abortado.
 */
export async function desenharLua(
  destino: HTMLCanvasElement,
  tamanho: number,
  { semente = SEMENTE_LUA, sinal }: { semente?: number; sinal?: AbortSignal } = {},
): Promise<boolean> {
  const S = Math.max(64, Math.round(tamanho));
  const k = S / 1024; // escala: os números abaixo foram ajustados para 1024 px
  const R = 0.44 * S;
  const c = S / 2;
  const sorteio = criarSorteio(semente);
  const ruido = criarRuido(semente);

  // luz de cima à esquerda, terminador suave
  const theta = 0.85;
  let [lx, ly, lz] = [-Math.cos(theta), -0.42, Math.sin(theta)];
  const ln = Math.hypot(lx, ly, lz);
  [lx, ly, lz] = [lx / ln, ly / ln, lz / ln];

  // ~34 crateras, a maioria pequena
  const crateras: Cratera[] = Array.from({ length: 34 }, () => {
    const ang = sorteio() * Math.PI * 2;
    const dist = Math.sqrt(sorteio()) * 0.95;
    return { u: Math.cos(ang) * dist, v: Math.sin(ang) * dist, r: 0.025 + 0.165 * sorteio() ** 2.4 };
  });

  // ---------- 1. imagem base, pixel a pixel ----------
  const base = document.createElement("canvas");
  base.width = base.height = S;
  const bctx = base.getContext("2d");
  if (!bctx) return false;
  const img = bctx.createImageData(S, S);
  const px = img.data;

  let inicio = performance.now();
  for (let y = 0; y < S; y++) {
    if (performance.now() - inicio > 10) {
      await ceder();
      if (abortou(sinal)) return false;
      inicio = performance.now();
    }
    const yn = y / k;
    for (let x = 0; x < S; x++) {
      const xn = x / k;
      // borda irregular de pincel seco
      const jitter =
        (ruido.fbm(xn * 0.018, yn * 0.018, 3) - 0.5) * 0.028 + (ruido.fbm(xn * 0.09, yn * 0.09, 3) - 0.5) * 0.014;
      const dx = (x - c) / (R * (1 + jitter));
      const dy = (y - c) / (R * (1 + jitter));
      const r = Math.hypot(dx, dy);
      if (r >= 1) continue;
      const alfa = 1 - smoothstep(0.975, 1, r);

      const nz = Math.sqrt(1 - r * r);
      const difusa = smoothstep(-0.22, 0.55, dx * lx + dy * ly + nz * lz);

      // coordenadas na esfera (comprimidas perto da borda)
      const u = Math.asin(dx) * 0.64;
      const v = Math.asin(dy) * 0.64;
      const mar = smoothstep(0.48, 0.66, ruido.fbm(u * 1.6 + 3.1, v * 1.6 + 7.7, 5));
      const detalhe = ruido.fbm(u * 7 + 11, v * 7 + 5, 4);

      // crateras: fundo escuro, parede do lado da luz na sombra, borda clara
      let luzCratera = 1;
      for (const cr of crateras) {
        const ou = u - cr.u;
        const ov = v - cr.v;
        if (Math.abs(ou) > cr.r || Math.abs(ov) > cr.r) continue;
        const d = Math.hypot(ou, ov) / cr.r;
        if (d >= 1) continue;
        const lado = (ou * lx + ov * ly) / (d * cr.r + 1e-6);
        luzCratera *= 1 - 0.22 * smoothstep(0.95, 0.2, d) - 0.18 * Math.max(0, lado) * smoothstep(1, 0.5, d);
        luzCratera += 0.14 * smoothstep(0.78, 0.92, d) * smoothstep(1, 0.92, d);
      }

      let cor = misturar(COR.luzA, COR.luzB, smoothstep(0.3, 0.75, detalhe));
      cor = misturar(cor, COR.mar, mar * 0.7);
      const sombra = misturar(COR.sombraA, COR.sombraB, detalhe);
      cor = misturar(sombra, cor, Math.min(1, Math.max(0, difusa * luzCratera)));

      // luz da cidade batendo no limbo, no lado da sombra: rosa embaixo à direita, lima embaixo à esquerda
      const limbo = smoothstep(0.72, 1, r) * (1 - difusa);
      cor = misturar(cor, COR.rosa, limbo * Math.max(0, dx * 0.6 + dy * 0.8) * 0.85);
      cor = misturar(cor, COR.lima, limbo * Math.max(0, -dx * 0.7 + dy * 0.7) * 0.35);

      const i = (y * S + x) * 4;
      px[i] = cor[0];
      px[i + 1] = cor[1];
      px[i + 2] = cor[2];
      px[i + 3] = alfa * 255;
    }
  }
  bctx.putImageData(img, 0, 0);
  await ceder();
  if (abortou(sinal)) return false;

  // ---------- 2. pinceladas por cima da base borrada ----------
  const pintura = document.createElement("canvas");
  pintura.width = pintura.height = S;
  const ctx = pintura.getContext("2d");
  if (!ctx) return false;
  ctx.filter = `blur(${(1.2 * k).toFixed(2)}px)`;
  ctx.drawImage(base, 0, 0);
  ctx.filter = "none";
  ctx.lineCap = "round";

  const tracos = Math.round(9000 * k * k);
  inicio = performance.now();
  for (let t = 0; t < tracos; t++) {
    if (performance.now() - inicio > 10) {
      await ceder();
      if (abortou(sinal)) return false;
      inicio = performance.now();
    }
    const ang = sorteio() * Math.PI * 2;
    const dist = Math.sqrt(sorteio()) * R;
    const x = c + Math.cos(ang) * dist;
    const y = c + Math.sin(ang) * dist;
    const i = (Math.floor(y) * S + Math.floor(x)) * 4;
    if (px[i + 3] < 128) continue;
    const brilho = entre(sorteio, 0.9, 1.12);
    const dir = -0.25 + (sorteio() - 0.5) * 0.7 + (ruido.fbm(x * 0.01 / k, y * 0.01 / k, 2) - 0.5) * 1.2;
    const comp = entre(sorteio, 6, 32) * k;
    const curva = (sorteio() - 0.5) * comp * 0.4;
    const ex = Math.cos(dir) * comp;
    const ey = Math.sin(dir) * comp;
    ctx.strokeStyle = `rgba(${Math.min(255, px[i] * brilho) | 0},${Math.min(255, px[i + 1] * brilho) | 0},${Math.min(255, px[i + 2] * brilho) | 0},${entre(sorteio, 0.25, 0.6).toFixed(2)})`;
    ctx.lineWidth = entre(sorteio, 1.5, 6) * k;
    ctx.beginPath();
    ctx.moveTo(x - ex / 2, y - ey / 2);
    ctx.quadraticCurveTo(x - Math.sin(dir) * curva, y + Math.cos(dir) * curva, x + ex / 2, y + ey / 2);
    ctx.stroke();
  }

  // recorta pela forma da base, para a borda continuar seca
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(base, 0, 0);

  // ---------- 3. grão ----------
  ctx.globalCompositeOperation = "source-atop";
  const graos = Math.round((S * S) / 90);
  for (let g = 0; g < graos; g++) {
    const claro = sorteio() < 0.5;
    ctx.fillStyle = claro ? "rgba(255,240,225,0.09)" : "rgba(20,10,50,0.1)";
    ctx.fillRect(sorteio() * S, sorteio() * S, k * 1.4, k * 1.4);
  }
  ctx.globalCompositeOperation = "source-over";

  if (abortou(sinal)) return false;
  destino.width = destino.height = S;
  destino.getContext("2d")?.drawImage(pintura, 0, 0);
  return true;
}
