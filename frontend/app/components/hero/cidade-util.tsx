/**
 * Utilidades do fundo do hero (cidade cyberpunk em SVG gerado por código).
 * Tudo é determinístico: o mesmo seed gera a mesma cidade no servidor e no
 * navegador, então a hidratação não diverge. Coordenadas sempre inteiras.
 */

/** Gerador pseudoaleatório pequeno (mulberry32) com seed fixa. */
export function criarRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof criarRng>;

export const inteiro = (r: Rng, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
export const sortear = <T,>(r: Rng, lista: readonly T[]) => lista[Math.floor(r() * lista.length)];

// mesmas cores dos tokens de globals.css (atributos SVG não leem var())
export const COR = {
  ink: "#0d0b22",
  pink: "#ff2d8a",
  cyan: "#22d8f2",
  lime: "#dcff2e",
  violet: "#6b4cff",
  cream: "#fff6e0",
} as const;

export const NEONS = [COR.pink, COR.cyan, COR.lime, COR.cream] as const;

/**
 * Ladrilho de janelas para os planos de trás: cada pattern é um bloco de
 * janelas com algumas acesas, para a repetição não parecer grade de planilha.
 */
export function PadraoJanelas({
  id,
  seed,
  cores,
  largura,
  altura,
  colunas,
  linhas,
  acesas,
  apagada,
}: {
  id: string;
  seed: number;
  cores: readonly string[];
  largura: number;
  altura: number;
  colunas: number;
  linhas: number;
  acesas: number;
  apagada?: string;
}) {
  const r = criarRng(seed);
  const cw = largura / colunas;
  const ch = altura / linhas;
  const jw = Math.max(1, Math.round(cw * 0.55));
  const jh = Math.max(1, Math.round(ch * 0.55));
  const janelas = [];
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      const acesa = r() < acesas;
      if (!acesa && !apagada) continue;
      janelas.push(
        <rect
          key={`${l}-${c}`}
          x={Math.round(c * cw + (cw - jw) / 2)}
          y={Math.round(l * ch + (ch - jh) / 2)}
          width={jw}
          height={jh}
          fill={acesa ? sortear(r, cores) : apagada}
        />,
      );
    }
  }
  return (
    <pattern id={id} width={largura} height={altura} patternUnits="userSpaceOnUse">
      {janelas}
    </pattern>
  );
}

/** Retícula de HQ (pontos) usada nas sombras, na lua e no céu. */
export function PadraoReticula({ id, passo, raio, cor }: { id: string; passo: number; raio: number; cor: string }) {
  return (
    <pattern id={id} width={passo} height={passo} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <circle cx={passo / 2} cy={passo / 2} r={raio} fill={cor} />
    </pattern>
  );
}

/** Texto vertical de letreiro, um caractere por linha (evita writing-mode no SVG). */
export function TextoVertical({
  x,
  y,
  texto,
  tamanho,
  cor,
}: {
  x: number;
  y: number;
  texto: string;
  tamanho: number;
  cor: string;
}) {
  return (
    <text x={x} y={y} fontSize={tamanho} fill={cor} textAnchor="middle" className="cid-jp">
      {[...texto].map((ch, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : Math.round(tamanho * 1.08)}>
          {ch}
        </tspan>
      ))}
    </text>
  );
}
