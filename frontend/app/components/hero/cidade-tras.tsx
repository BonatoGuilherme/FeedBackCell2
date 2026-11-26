/**
 * Planos de trás da cidade: o horizonte distante (azulado, sem contorno) e o
 * plano do meio (contorno fino, sombra em dois tons, letreiros e faixas de neon).
 * JSX gerado uma vez, no carregamento do módulo, com seeds fixas.
 */

import { COR, NEONS, PadraoJanelas, criarRng, inteiro, sortear, TextoVertical, type Rng } from "./cidade-util";

const LUZ_ANTENA = ["cid-blink cid-blink--1", "cid-blink cid-blink--2", "cid-blink cid-blink--3"];

// ---------- horizonte (viewBox 1440 x 860) ----------

function silhuetas(r: Rng, alturaMin: number, alturaMax: number, larguraMin: number, larguraMax: number) {
  const lista: { x: number; w: number; topo: number; tipo: number }[] = [];
  let x = -20;
  while (x < 1460) {
    const w = inteiro(r, larguraMin, larguraMax);
    // envelope: mais alto no meio e à direita, um pouco mais baixo no canto esquerdo
    const t = x / 1440;
    const envelope = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.85));
    const alto = Math.round((alturaMin + r() * (alturaMax - alturaMin)) * envelope);
    lista.push({ x, w, topo: 860 - alto, tipo: inteiro(r, 0, 4) });
    x += w - inteiro(r, 0, 10);
  }
  return lista;
}

function perfil(x: number, w: number, topo: number, tipo: number) {
  const b = 860;
  const e = Math.round(w * 0.18);
  switch (tipo) {
    case 1: // degraus
      return `M${x} ${b}V${topo + 34}H${x + e}V${topo + 14}H${x + w - e}V${topo + 34}H${x + w}V${b}Z`;
    case 2: // ponta
      return `M${x} ${b}V${topo + 30}L${x + w / 2} ${topo - 26}L${x + w} ${topo + 30}V${b}Z`;
    case 3: // telhado inclinado
      return `M${x} ${b}V${topo + 22}L${x + w} ${topo}V${b}Z`;
    default:
      return `M${x} ${b}V${topo}H${x + w}V${b}Z`;
  }
}

function criarHorizonte() {
  const r = criarRng(71);
  const longe = silhuetas(r, 360, 700, 34, 80);
  const perto = silhuetas(r, 300, 600, 44, 104);
  const antenas: React.ReactNode[] = [];
  const neons: React.ReactNode[] = [];

  const corpoPerto = perto.map((p, i) => {
    const d = perfil(p.x, p.w, p.topo, p.tipo);
    if (r() < 0.32) {
      const ax = p.x + Math.round(p.w * (0.3 + r() * 0.4));
      const at = p.tipo === 2 ? p.topo - 26 : p.topo;
      const alto = inteiro(r, 18, 60);
      antenas.push(
        <g key={`a${i}`}>
          <path d={`M${ax} ${at}V${at - alto}`} stroke="#3a3a92" strokeWidth={2} />
          <circle cx={ax} cy={at - alto} r={2.5} fill={COR.pink} className={sortear(r, LUZ_ANTENA)} />
        </g>,
      );
    }
    if (r() < 0.22) {
      const nx = p.x + inteiro(r, 6, Math.max(7, p.w - 8));
      const cor = sortear(r, [COR.pink, COR.cyan, COR.violet]);
      const y = p.topo + inteiro(r, 30, 80);
      const alto = inteiro(r, 120, 300);
      neons.push(
        <g key={`n${i}`} opacity={0.75}>
          <rect x={nx - 3} y={y} width={8} height={alto} fill={cor} opacity={0.18} />
          <rect x={nx} y={y} width={2} height={alto} fill={cor} />
        </g>,
      );
    }
    return (
      <g key={i}>
        <path d={d} fill={i % 3 === 0 ? "#29286f" : i % 3 === 1 ? "#2d2b7d" : "#26246a"} />
        <path d={d} fill={`url(#cid-jan-longe-${i % 2})`} />
      </g>
    );
  });

  return (
    <svg className="cid-camada cid-camada--longe" viewBox="0 0 1440 860" preserveAspectRatio="xMidYMax slice">
      <defs>
        <PadraoJanelas
          id="cid-jan-longe-0"
          seed={3}
          cores={["#8f86e8", "#7fd6ff", "#ffb3d9", "#f7f0c8"]}
          largura={36}
          altura={44}
          colunas={4}
          linhas={4}
          acesas={0.34}
        />
        <PadraoJanelas
          id="cid-jan-longe-1"
          seed={8}
          cores={["#a49cf0", "#7fd6ff", "#ffd27f"]}
          largura={30}
          altura={52}
          colunas={3}
          linhas={5}
          acesas={0.28}
        />
        <linearGradient id="cid-neblina-longe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.25" stopColor="#7c5fd8" stopOpacity={0} />
          <stop offset="1" stopColor="#a464d8" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <g fill="#201f5c" opacity={0.9}>
        {longe.map((p, i) => (
          <path key={i} d={perfil(p.x, p.w, p.topo - 40, p.tipo)} />
        ))}
      </g>
      <rect width="1440" height="860" fill="url(#cid-neblina-longe)" opacity={0.6} />
      {corpoPerto}
      {neons}
      {antenas}
      <rect width="1440" height="860" fill="url(#cid-neblina-longe)" />
    </svg>
  );
}

// ---------- plano do meio (viewBox 1440 x 700) ----------

const PLAQUINHAS = ["口コミ", "5G", "24H", "WIFI", "CELL", "新機種", "スマホ", "営業中"];
const VERTICAIS = ["携帯", "写真", "評価", "図鑑"];

function predioMeio(r: Rng, x: number, w: number, topo: number, i: number) {
  const b = 700;
  const lado = Math.round(w * 0.24);
  const tons = [
    ["#3b2c8f", "#271d68"],
    ["#45309c", "#2b1f72"],
    ["#36297f", "#211a5c"],
  ][i % 3];
  const extras: React.ReactNode[] = [];

  // caixa d'água ou antena no telhado
  const t = r();
  if (t < 0.3) {
    const cx = x + inteiro(r, 10, Math.max(11, w - 30));
    extras.push(
      <g key="cx" stroke="#140f3a" strokeWidth={2}>
        <path d={`M${cx + 3} ${topo}l3 -12M${cx + 17} ${topo}l-3 -12`} />
        <rect x={cx} y={topo - 32} width={20} height={20} rx={3} fill="#5a45b0" />
        <path d={`M${cx - 2} ${topo - 32}L${cx + 10} ${topo - 40}L${cx + 22} ${topo - 32}Z`} fill="#4a3a9a" />
      </g>,
    );
  } else if (t < 0.6) {
    const ax = x + inteiro(r, 8, Math.max(9, w - 8));
    extras.push(
      <g key="an" stroke="#140f3a" strokeWidth={2}>
        <path d={`M${ax} ${topo}V${topo - 46}M${ax - 9} ${topo - 34}H${ax + 9}M${ax - 6} ${topo - 24}H${ax + 6}`} />
        <circle cx={ax} cy={topo - 46} r={2.5} fill={COR.pink} stroke="none" className={sortear(r, LUZ_ANTENA)} />
      </g>,
    );
  } else if (t < 0.8) {
    extras.push(
      <rect key="ac" x={x + 8} y={topo - 12} width={26} height={12} fill="#4a3a9a" stroke="#140f3a" strokeWidth={2} />,
    );
  }

  // faixa de neon vertical subindo pela fachada
  if (r() < 0.55) {
    const cor = sortear(r, NEONS);
    const nx = x + (r() < 0.5 ? 4 : w - lado - 6);
    const alto = Math.round((b - topo) * (0.4 + r() * 0.5));
    extras.push(
      <g key="nf" className={r() < 0.3 ? "cid-flicker" : undefined}>
        <rect x={nx - 4} y={topo + 16} width={11} height={alto} fill={cor} opacity={0.2} />
        <rect x={nx} y={topo + 16} width={3} height={alto} fill={cor} />
      </g>,
    );
  }

  // plaquinha horizontal ou letreiro vertical
  const s = r();
  if (s < 0.45 && w > 60) {
    const texto = sortear(r, PLAQUINHAS);
    const cor = sortear(r, NEONS);
    const pw = Math.min(w - 16, 18 + texto.length * 13);
    const px = x + Math.round((w - lado - pw) / 2);
    const py = topo + inteiro(r, 30, 120);
    extras.push(
      <g key="pl" className={r() < 0.35 ? "cid-flicker cid-flicker--lento" : undefined}>
        <rect x={px - 5} y={py - 5} width={pw + 10} height={32} rx={4} fill={cor} opacity={0.22} />
        <rect x={px} y={py} width={pw} height={22} rx={2} fill={COR.ink} stroke={cor} strokeWidth={2.5} />
        <text x={px + pw / 2} y={py + 16} fontSize={14} fill={cor} textAnchor="middle" className="cid-jp">
          {texto}
        </text>
      </g>,
    );
  } else if (s < 0.75) {
    const texto = sortear(r, VERTICAIS);
    const cor = sortear(r, [COR.pink, COR.cyan, COR.lime]);
    const vx = x + w - lado + 2;
    const vy = topo + inteiro(r, 24, 90);
    extras.push(
      <g key="vt">
        <rect x={vx - 6} y={vy - 6} width={34} height={texto.length * 24 + 22} fill={cor} opacity={0.2} />
        <rect x={vx} y={vy} width={22} height={texto.length * 24 + 10} fill={cor} stroke="#140f3a" strokeWidth={2} />
        <TextoVertical x={vx + 11} y={vy + 22} texto={texto} tamanho={16} cor={COR.ink} />
      </g>,
    );
  }

  return (
    <g key={i}>
      <rect x={x} y={topo} width={w} height={b - topo} fill={tons[0]} />
      <rect x={x} y={topo} width={w - lado} height={b - topo} fill={`url(#cid-jan-meio-${i % 3})`} />
      <rect x={x + w - lado} y={topo} width={lado} height={b - topo} fill={tons[1]} />
      <rect x={x + w - lado} y={topo} width={lado} height={b - topo} fill="url(#cid-ret-meio)" />
      <rect x={x - 3} y={topo - 6} width={w + 6} height={8} fill="#5a45b0" stroke="#140f3a" strokeWidth={2} />
      <rect x={x} y={topo} width={w} height={b - topo} fill="none" stroke="#140f3a" strokeWidth={2} />
      {extras}
    </g>
  );
}

function criarMeio() {
  const r = criarRng(29);
  const predios: React.ReactNode[] = [];
  let x = -10;
  let i = 0;
  while (x < 1450) {
    const w = inteiro(r, 62, 128);
    // à esquerda (atrás do texto) a cidade do meio fica mais baixa
    const alto = x < 620 ? inteiro(r, 200, 320) : inteiro(r, 300, 540);
    predios.push(predioMeio(r, x, w, 700 - alto, i));
    x += w + inteiro(r, -6, 8);
    i++;
  }
  return (
    <svg className="cid-camada cid-camada--meio" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMax slice">
      <defs>
        <PadraoJanelas
          id="cid-jan-meio-0"
          seed={41}
          cores={["#ffe9a8", "#9ff3ff", "#ff9fd0", "#3a2c84"]}
          largura={42}
          altura={46}
          colunas={3}
          linhas={2}
          acesas={0.5}
          apagada="#231a5c"
        />
        <PadraoJanelas
          id="cid-jan-meio-1"
          seed={43}
          cores={["#ffd27f", "#e6ff9a", "#9ff3ff"]}
          largura={36}
          altura={60}
          colunas={2}
          linhas={3}
          acesas={0.42}
          apagada="#211857"
        />
        <PadraoJanelas
          id="cid-jan-meio-2"
          seed={47}
          cores={["#ff9fd0", "#ffe9a8", "#b9a8ff"]}
          largura={48}
          altura={40}
          colunas={4}
          linhas={2}
          acesas={0.38}
          apagada="#241b60"
        />
        <pattern id="cid-ret-meio" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={3} cy={3} r={1.1} fill="#0d0b22" opacity={0.55} />
        </pattern>
        <linearGradient id="cid-neblina-meio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#8a5ad8" stopOpacity={0} />
          <stop offset="1" stopColor="#9b4fc8" stopOpacity={0.5} />
        </linearGradient>
      </defs>
      {predios}
      <rect width="1440" height="700" fill="url(#cid-neblina-meio)" />
    </svg>
  );
}

// ---------- céu (viewBox 1440 x 900, preso no topo) ----------

function criarCeu() {
  const r = criarRng(13);
  const estrelas: React.ReactNode[] = [];
  for (let k = 0; k < 46; k++) {
    const x = inteiro(r, 10, 1430);
    const y = inteiro(r, 10, 420);
    const t = r();
    if (t < 0.18) {
      // brilho de quatro pontas, estilo HQ
      const s = inteiro(r, 5, 8);
      estrelas.push(
        <path
          key={k}
          d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`}
          fill={COR.cream}
          className={sortear(r, LUZ_ANTENA)}
        />,
      );
    } else {
      estrelas.push(<rect key={k} x={x} y={y} width={2} height={2} fill={t < 0.5 ? "#b9a8ff" : COR.cream} opacity={0.7} />);
    }
  }
  // lua cartoon: contorno grosso, sombra chapada com retícula e crateras
  const lx = 884;
  const ly = 122;
  const raio = 58;
  return (
    <svg className="cid-ceu" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice">
      <defs>
        <pattern id="cid-ret-ceu" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={4.5} cy={4.5} r={1.4} fill="#ff6fb4" />
        </pattern>
        <pattern id="cid-ret-lua" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={3} cy={3} r={1.2} fill="#c9a86a" />
        </pattern>
        <linearGradient id="cid-ret-ceu-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#fff" stopOpacity={1} />
        </linearGradient>
        <mask id="cid-ret-ceu-mask">
          <rect width="1440" height="900" fill="url(#cid-ret-ceu-fade)" />
        </mask>
        <clipPath id="cid-clip-lua">
          <circle cx={lx} cy={ly} r={raio} />
        </clipPath>
      </defs>
      <rect width="1440" height="900" fill="url(#cid-ret-ceu)" mask="url(#cid-ret-ceu-mask)" opacity={0.16} />
      {estrelas}
      <g>
        <circle cx={lx} cy={ly} r={raio + 26} fill={COR.cream} opacity={0.07} />
        <circle cx={lx} cy={ly} r={raio + 12} fill={COR.cream} opacity={0.1} />
        <circle cx={lx} cy={ly} r={raio} fill={COR.cream} />
        <g clipPath="url(#cid-clip-lua)">
          <circle cx={lx + 26} cy={ly + 18} r={raio} fill="#f0dca8" />
          <circle cx={lx + 26} cy={ly + 18} r={raio} fill="url(#cid-ret-lua)" />
          <circle cx={lx - 34} cy={ly - 30} r={raio} fill="none" stroke="#fff" strokeWidth={6} opacity={0.7} />
        </g>
        <g fill="#e8d098" stroke={COR.ink} strokeWidth={2.5}>
          <circle cx={lx - 18} cy={ly - 14} r={11} />
          <circle cx={lx + 22} cy={ly + 22} r={7} />
          <circle cx={lx + 14} cy={ly - 26} r={5} />
        </g>
        <circle cx={lx} cy={ly} r={raio} fill="none" stroke={COR.ink} strokeWidth={4} />
      </g>
      <g className="cid-nuvem" fill="#3a2c8a" stroke={COR.ink} strokeWidth={3} strokeLinejoin="round">
        <path d={`M${lx - 120} ${ly + 52}q8 -22 32 -16q10 -20 34 -12q16 -14 36 4q26 -4 30 16q14 2 14 12h-150q-6 0 4 -4z`} />
        <path d="M150 230q10 -18 30 -12q12 -18 34 -8q20 -8 28 12q16 2 16 14h-114q-4 -4 6 -6z" opacity={0.85} />
      </g>
    </svg>
  );
}

export const CEU = criarCeu();
export const HORIZONTE = criarHorizonte();
export const CIDADE_MEIO = criarMeio();
