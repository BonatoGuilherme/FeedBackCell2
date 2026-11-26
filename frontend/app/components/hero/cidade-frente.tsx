/**
 * Plano da frente da cidade (viewBox 1440 x 520): prédios em estilo cartoon,
 * com contorno grosso, sombra chapada em três tons e retícula de HQ; janelas
 * uma a uma (cortina, planta, persiana), ar-condicionado, escada de incêndio,
 * caixas d'água, antenas, fios, lojas com toldo e a rua molhada refletindo tudo.
 */

import { COR, criarRng, inteiro, sortear, TextoVertical, type Rng } from "./cidade-util";

const CHAO = 440;
const TRACO = COR.ink;

type Predio = { x: number; w: number; topo: number; loja?: string; escada?: boolean; teto?: "caixa" | "antena" | "prato" };

const PREDIOS: Predio[] = [
  { x: -10, w: 118, topo: 318, loja: "CELL", teto: "antena" },
  { x: 104, w: 96, topo: 352, loja: "口コミ" },
  { x: 194, w: 132, topo: 290, escada: true, teto: "caixa" },
  { x: 320, w: 104, topo: 340, loja: "24H" },
  { x: 418, w: 124, topo: 306, teto: "prato" },
  { x: 536, w: 96, topo: 350, loja: "入荷" },
  { x: 626, w: 112, topo: 282, escada: true, teto: "caixa" },
  { x: 732, w: 124, topo: 196, teto: "antena" },
  { x: 850, w: 146, topo: 150, escada: true, teto: "caixa" },
  { x: 990, w: 112, topo: 226, teto: "prato" },
  { x: 1096, w: 150, topo: 128, teto: "caixa" },
  { x: 1240, w: 106, topo: 206, escada: true, teto: "antena" },
  { x: 1340, w: 116, topo: 166, teto: "caixa" },
];

// [fachada, sombra, luz da borda, parapeito]
const TONS = [
  ["#4b37b4", "#33268a", "#8a76f0", "#6a55d6"],
  ["#5c3aa6", "#3f277c", "#a27ae6", "#7b55c4"],
  ["#3a3a9e", "#28287a", "#7480ea", "#5458c4"],
  ["#6a3a9a", "#4a2672", "#b878e0", "#8a4fb8"],
] as const;

const LUZES = ["#ffe39a", "#ffe39a", "#ffd27f", "#9ff3ff", "#ff9fd0", "#e6ff9a"];
const CORTINAS: Record<string, string> = {
  "#ffe39a": "#e0744a",
  "#ffd27f": "#c44a86",
  "#9ff3ff": "#3a6fd0",
  "#ff9fd0": "#a4307a",
  "#e6ff9a": "#4a9a4a",
};
const PISCA = ["cid-janela cid-janela--1", "cid-janela cid-janela--2", "cid-janela cid-janela--3"];

// Peças repetidas da fachada ficam em <defs> e são reaproveitadas com <use>
// (posição por x/y; a cor da luz vem do fill do <use>): o HTML fica bem menor.
const PECAS = (
  <>
    <g id="cid-ja">
      <rect width={14} height={20} fill="#1b1446" stroke={TRACO} strokeWidth={2} />
      <path d="M3 12L10 4" stroke="#8f86e8" strokeWidth={1.5} opacity={0.45} />
    </g>
    <g id="cid-jl">
      <rect x={-3} y={-3} width={20} height={26} opacity={0.16} />
      <rect width={14} height={20} stroke={TRACO} strokeWidth={2} />
      <path d="M7 0v20" stroke={TRACO} strokeWidth={1} opacity={0.5} />
    </g>
    <path id="cid-d-cortina" d="M0 0h6q-3 10 0 20h-6zM14 0h-5q2 10 0 20h5z" stroke={TRACO} strokeWidth={1} />
    <g id="cid-d-planta" stroke={TRACO} strokeWidth={1}>
      <path d="M4 17h6l-1 3h-4z" fill="#b0532e" />
      <circle cx={5} cy={14} r={2.6} fill="#3ccf7a" />
      <circle cx={9} cy={13} r={3} fill="#2fb46a" />
    </g>
    <path id="cid-d-persiana" d="M0 5h14M0 10h14M0 15h14" stroke={TRACO} strokeWidth={1} opacity={0.35} />
    <path id="cid-d-pessoa" d="M3 20q1 -7 4 -7q3 0 4 7zM7 12a3 3 0 1 0 0 -6a3 3 0 1 0 0 6" fill="#2a1d5e" />
    <path id="cid-d-brilho" d="M1 1h12" stroke="#fff" strokeWidth={2} opacity={0.6} />
    <g id="cid-ac" stroke={TRACO} strokeWidth={1.6}>
      <rect width={16} height={9} fill="#c9c2ee" />
      <path d="M3 3h10M3 6h10" strokeWidth={0.8} />
    </g>
  </>
);

function janela(r: Rng, x: number, y: number, chave: string, piscar: boolean) {
  if (r() < 0.42) return <use key={chave} href="#cid-ja" x={x} y={y} />;
  const luz = sortear(r, LUZES);
  const extra = r();
  const classe = piscar ? sortear(r, PISCA) : undefined;
  let detalhe: React.ReactNode = null;
  if (extra < 0.24) {
    detalhe = <use href="#cid-d-cortina" x={x} y={y} fill={CORTINAS[luz] ?? "#c44a86"} className={classe} />;
  } else if (extra < 0.38) {
    detalhe = <use href="#cid-d-planta" x={x} y={y} className={classe} />;
  } else if (extra < 0.5) {
    detalhe = <use href="#cid-d-persiana" x={x} y={y} className={classe} />;
  } else if (extra < 0.56) {
    // silhueta de alguém olhando o celular
    detalhe = <use href="#cid-d-pessoa" x={x} y={y} className={classe} />;
  } else if (extra < 0.62) {
    detalhe = <use href="#cid-d-brilho" x={x} y={y} className={classe} />;
  }
  if (!detalhe) return <use key={chave} href="#cid-jl" x={x} y={y} fill={luz} className={classe} />;
  return (
    <g key={chave}>
      <use href="#cid-jl" x={x} y={y} fill={luz} className={classe} />
      {detalhe}
    </g>
  );
}

function caixaDagua(x: number, topo: number) {
  return (
    <g key="cx" stroke={TRACO} strokeWidth={2.5} strokeLinejoin="round">
      <path d={`M${x + 4} ${topo}l3 -16M${x + 26} ${topo}l-3 -16M${x + 6} ${topo - 8}h20`} fill="none" />
      <rect x={x} y={topo - 46} width={30} height={30} rx={4} fill="#8a6ad8" />
      <rect x={x + 18} y={topo - 46} width={12} height={30} fill="#5a42a8" stroke="none" />
      <path d={`M${x + 8} ${topo - 44}v26M${x + 15} ${topo - 44}v26`} strokeWidth={1} opacity={0.5} />
      <rect x={x} y={topo - 46} width={30} height={30} rx={4} fill="none" />
      <path d={`M${x - 3} ${topo - 46}L${x + 15} ${topo - 58}L${x + 33} ${topo - 46}Z`} fill="#6a50c0" />
    </g>
  );
}

function antena(r: Rng, x: number, topo: number) {
  const alto = inteiro(r, 46, 70);
  return (
    <g key="an" stroke={TRACO} strokeWidth={2.5} strokeLinecap="round" fill="none">
      <path d={`M${x} ${topo}V${topo - alto}`} />
      <path d={`M${x - 14} ${topo - alto + 10}H${x + 14}M${x - 10} ${topo - alto + 20}H${x + 10}M${x - 6} ${topo - alto + 30}H${x + 6}`} strokeWidth={2} />
      <circle cx={x} cy={topo - alto - 3} r={3} fill={COR.pink} stroke="none" className="cid-blink cid-blink--2" />
    </g>
  );
}

function prato(x: number, topo: number) {
  return (
    <g key="pr" stroke={TRACO} strokeWidth={2.5} strokeLinejoin="round">
      <rect x={x} y={topo - 14} width={34} height={14} fill="#7a64d0" />
      <path d={`M${x + 28} ${topo - 10}v6M${x + 22} ${topo - 10}v6`} strokeWidth={1.2} />
      <circle cx={x + 10} cy={topo - 7} r={4} fill="#4a3a9a" strokeWidth={1.5} />
      <path d={`M${x + 44} ${topo}l4 -14`} />
      <path d={`M${x + 38} ${topo - 30}a14 14 0 0 0 24 14z`} fill="#d8d0ff" />
    </g>
  );
}

function escadaIncendio(x: number, w: number, topo: number, andares: number[]) {
  const largura = Math.min(64, Math.round(w * 0.55));
  const partes = andares.map((y, i) => {
    const py = y + 24;
    const lado = i % 2 === 0;
    return (
      <g key={i}>
        <rect x={x} y={py} width={largura} height={4} fill={TRACO} />
        <path d={`M${x} ${py - 11}h${largura}`} strokeWidth={1.6} />
        <path d={Array.from({ length: Math.floor(largura / 8) + 1 }, (_, k) => `M${x + k * 8} ${py - 11}v11`).join("")} strokeWidth={1.2} />
        {i < andares.length - 1 && (
          <path
            d={lado ? `M${x + 6} ${py + 4}L${x + largura - 10} ${andares[i + 1] + 24}` : `M${x + largura - 6} ${py + 4}L${x + 10} ${andares[i + 1] + 24}`}
            strokeWidth={2.4}
          />
        )}
      </g>
    );
  });
  return (
    <g key="esc" stroke={TRACO} fill="none">
      {partes}
    </g>
  );
}

function loja(r: Rng, p: Predio) {
  const x0 = p.x + 8;
  const x1 = p.x + p.w - 8;
  const cor = sortear(r, [COR.pink, COR.cyan, COR.lime]);
  const listras = [];
  for (let x = x0 - 4; x < x1 + 4; x += 12) {
    listras.push(
      <path key={x} d={`M${x} ${CHAO - 62}h6v14q-3 5 -6 0z`} fill={COR.pink} />,
      <path key={`c${x}`} d={`M${x + 6} ${CHAO - 62}h6v14q-3 5 -6 0z`} fill={COR.cream} />,
    );
  }
  return (
    <g key="loja">
      <rect x={x0} y={CHAO - 46} width={x1 - x0} height={46} fill="#ffcf7a" stroke={TRACO} strokeWidth={3} />
      <rect x={x0 + 4} y={CHAO - 42} width={x1 - x0 - 8} height={8} fill="#fff1c4" opacity={0.8} />
      <path d={`M${x0 + 10} ${CHAO}v-18h10v18M${x1 - 26} ${CHAO - 30}h16v12h-16z`} fill="#c98a3a" stroke={TRACO} strokeWidth={2} />
      <g stroke={TRACO} strokeWidth={2}>
        {listras}
      </g>
      <path d={`M${x0 - 4} ${CHAO - 62}H${x1 + 4}`} stroke={TRACO} strokeWidth={3} />
      <g className={r() < 0.5 ? "cid-flicker" : undefined}>
        <rect x={p.x + p.w / 2 - 30} y={CHAO - 90} width={60} height={24} rx={3} fill={cor} opacity={0.25} />
        <rect x={p.x + p.w / 2 - 25} y={CHAO - 86} width={50} height={18} rx={2} fill={COR.ink} stroke={cor} strokeWidth={2.5} />
        <text x={p.x + p.w / 2} y={CHAO - 72} fontSize={13} fill={cor} textAnchor="middle" className="cid-jp">
          {p.loja}
        </text>
      </g>
    </g>
  );
}

function predio(r: Rng, p: Predio, i: number) {
  const [fachada, sombra, borda, parapeito] = TONS[i % 4];
  const { x, w, topo } = p;
  const faixa = Math.round(w * 0.3);
  const fimJanelas = CHAO - (p.loja ? 100 : 34);
  const andares: number[] = [];
  for (let y = topo + 22; y + 20 <= fimJanelas; y += 36) andares.push(y);
  const colunas = Math.max(1, Math.floor((w - 12) / 24));
  const passo = (w - 12) / colunas;
  const inicioEscada = p.escada ? Math.min(64, Math.round(w * 0.55)) + 8 : 0;

  const janelas: React.ReactNode[] = [];
  const arCond: React.ReactNode[] = [];
  andares.forEach((y, a) => {
    for (let c = 0; c < colunas; c++) {
      const jx = Math.round(x + 6 + c * passo + (passo - 14) / 2);
      if (p.escada && jx < x + inicioEscada && r() < 0.5) continue;
      janelas.push(janela(r, jx, y, `${a}-${c}`, r() < 0.035));
      if (!p.escada && r() < 0.16) {
        arCond.push(<use key={`ac${a}-${c}`} href="#cid-ac" x={jx - 1} y={y + 24} />);
      }
    }
  });

  const teto: React.ReactNode[] = [];
  if (p.teto === "caixa") teto.push(caixaDagua(x + inteiro(r, 10, Math.max(11, w - 44)), topo - 6));
  if (p.teto === "antena") teto.push(antena(r, x + Math.round(w * 0.7), topo - 6));
  if (p.teto === "prato") teto.push(prato(x + 10, topo - 6));

  // faixa de neon subindo pela quina e letreiro vertical saindo da fachada
  const neon = i % 3 !== 1 && !p.loja;
  const corNeon = sortear(r, [COR.pink, COR.cyan, COR.lime]);
  const placa = !p.loja && i % 2 === 0 && w > 100;

  return (
    <g key={i}>
      {teto}
      <rect x={x} y={topo} width={w} height={CHAO - topo} fill={fachada} />
      <rect x={x + w - faixa} y={topo} width={faixa} height={CHAO - topo} fill={sombra} />
      <rect x={x + w - faixa} y={topo} width={faixa} height={CHAO - topo} fill="url(#cid-ret-perto)" />
      <path d={`M${x + 4} ${topo + 8}V${CHAO}`} stroke={borda} strokeWidth={3} />
      {janelas}
      {arCond}
      {p.escada && escadaIncendio(x + 6, w, topo, andares)}
      {p.loja && loja(r, p)}
      <rect x={x} y={topo} width={w} height={CHAO - topo} fill="none" stroke={TRACO} strokeWidth={4} strokeLinejoin="round" />
      <rect x={x - 5} y={topo - 9} width={w + 10} height={11} fill={parapeito} stroke={TRACO} strokeWidth={3} />
      {neon && (
        <g className={i % 4 === 0 ? "cid-flicker cid-flicker--lento" : undefined}>
          <rect x={x + w - 9} y={topo + 14} width={12} height={CHAO - topo - 40} fill={corNeon} opacity={0.22} />
          <rect x={x + w - 5} y={topo + 14} width={4} height={CHAO - topo - 40} fill={corNeon} />
        </g>
      )}
      {placa && (
        <g className={i === 4 ? "cid-flicker" : undefined}>
          <path d={`M${x + w} ${topo + 40}h12M${x + w} ${topo + 130}h12`} stroke={TRACO} strokeWidth={3} />
          <rect x={x + w + 2} y={topo + 26} width={32} height={124} fill={corNeon} opacity={0.25} />
          <rect x={x + w + 6} y={topo + 30} width={24} height={116} fill={COR.ink} stroke={corNeon} strokeWidth={3} />
          <TextoVertical x={x + w + 18} y={topo + 54} texto={sortear(r, ["新機種", "携帯", "営業中", "図鑑"])} tamanho={17} cor={corNeon} />
        </g>
      )}
    </g>
  );
}

function fios(r: Rng) {
  const lista: React.ReactNode[] = [];
  for (let i = 0; i < PREDIOS.length - 1; i++) {
    const a = PREDIOS[i];
    const b = PREDIOS[i + 1];
    const x1 = a.x + a.w - 6;
    const y1 = a.topo + 14;
    const x2 = b.x + 6;
    const y2 = b.topo + 14;
    // fio longo cruzando a rua, com lampiões pendurados
    const xa = a.x + 20;
    const xb = b.x + b.w - 20;
    const ya = a.topo + 40;
    const yb = b.topo + 40;
    const queda = inteiro(r, 30, 60);
    const mx = (xa + xb) / 2;
    const my = Math.max(ya, yb) + queda;
    lista.push(
      <path key={`f${i}`} d={`M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.max(y1, y2) + 14} ${x2} ${y2}`} />,
      <path key={`g${i}`} d={`M${xa} ${ya}Q${mx} ${my} ${xb} ${yb}`} />,
    );
    if (i % 2 === 0) {
      const t = 0.5;
      const lx = Math.round((1 - t) * (1 - t) * xa + 2 * t * (1 - t) * mx + t * t * xb);
      const ly = Math.round((1 - t) * (1 - t) * ya + 2 * t * (1 - t) * my + t * t * yb);
      const cor = sortear(r, [COR.pink, COR.lime, COR.cyan]);
      lista.push(
        <g key={`l${i}`} className={i === 4 ? "cid-flicker cid-flicker--lento" : undefined}>
          <circle cx={lx} cy={ly + 12} r={11} fill={cor} opacity={0.2} stroke="none" />
          <path d={`M${lx} ${ly}v5`} />
          <rect x={lx - 5} y={ly + 5} width={10} height={14} rx={4} fill={cor} strokeWidth={1.5} />
        </g>,
      );
    }
  }
  return (
    <g stroke={TRACO} strokeWidth={1.6} fill="none">
      {lista}
    </g>
  );
}

function rua(r: Rng) {
  // reflexos de neon na água: um <path> por cor e intensidade, em vez de 90 <rect>
  const CORES_REFLEXO = [COR.pink, COR.cyan, COR.lime, COR.cream, "#ffcf7a"];
  const grupos = new Map<string, string>();
  for (let k = 0; k < 90; k++) {
    const x = inteiro(r, 0, 1430);
    const y = inteiro(r, CHAO + 8, 516);
    const w = inteiro(r, 8, 46);
    const cor = sortear(r, CORES_REFLEXO);
    const opacidade = r() < 0.5 ? 0.25 : 0.45;
    const chave = `${cor}|${opacidade}`;
    grupos.set(chave, `${grupos.get(chave) ?? ""}M${x} ${y}h${w}v2h${-w}z`);
  }
  const reflexos = [...grupos].map(([chave, d]) => {
    const [cor, opacidade] = chave.split("|");
    return <path key={chave} d={d} fill={cor} opacity={Number(opacidade)} />;
  });
  const poças = [
    [160, 492, 80, 10],
    [520, 470, 110, 9],
    [880, 500, 90, 11],
    [1230, 478, 120, 10],
  ].map(([cx, cy, rx, ry]) => (
    <g key={cx}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#2c2280" stroke="#6a5ad0" strokeWidth={1.5} opacity={0.75} />
      <path d={`M${cx - rx * 0.5} ${cy - 2}h${rx * 0.6}M${cx - rx * 0.2} ${cy + 3}h${rx * 0.5}`} stroke={COR.cyan} strokeWidth={2} opacity={0.6} />
    </g>
  ));
  const luzLojas = PREDIOS.filter((p) => p.loja).map((p) => (
    <path key={p.x} d={`M${p.x + 8} ${CHAO}h${p.w - 16}l24 60h${-p.w - 32}z`} fill="#ffcf7a" opacity={0.16} />
  ));
  return (
    <g>
      <rect x={0} y={CHAO} width={1440} height={80} fill="url(#cid-rua)" />
      <use href="#cid-perto-predios" transform={`matrix(1 0 0 -0.55 0 ${Math.round(CHAO * 1.55)})`} opacity={0.34} clipPath="url(#cid-clip-rua)" />
      {luzLojas}
      <path
        d={Array.from({ length: 13 }, (_, k) => `M0 ${CHAO + 6 + k * 6}h1440v2h-1440z`).join("")}
        fill={COR.ink}
        opacity={0.45}
      />
      {poças}
      {reflexos}
      <rect x={-4} y={CHAO - 2} width={1448} height={7} fill="#2b2070" stroke={TRACO} strokeWidth={3} />
    </g>
  );
}

function criarFrente() {
  const r = criarRng(97);
  return (
    <svg className="cid-camada cid-camada--perto" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice">
      <defs>
        {PECAS}
        <pattern id="cid-ret-perto" width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={2.5} cy={2.5} r={1.15} fill={COR.ink} opacity={0.6} />
        </pattern>
        <linearGradient id="cid-rua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24186a" />
          <stop offset="1" stopColor={COR.ink} />
        </linearGradient>
        <clipPath id="cid-clip-rua">
          <rect x={0} y={CHAO} width={1440} height={80} />
        </clipPath>
      </defs>
      <g id="cid-perto-predios">
        {PREDIOS.map((p, i) => predio(r, p, i))}
        {fios(r)}
      </g>
      {rua(r)}
    </svg>
  );
}

export const CIDADE_FRENTE = criarFrente();
