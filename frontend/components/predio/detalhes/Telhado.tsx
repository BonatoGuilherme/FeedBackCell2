/**
 * Telhado do prédio (só decoração): treliça que segura o telão, antena com
 * luz de aviso aéreo, holofote apontando para o telão, caixa d'água e
 * parabólica. Silhuetas escuras com a borda clareada pela lua (de cima à
 * esquerda). Cores dos tokens em src/lib/predio/paleta.ts (atributo SVG não lê var()).
 */

import { paleta } from "@/src/lib/predio/paleta";

const SILHUETA = paleta.noite0;
const LUZ_LUA = paleta.lavanda;
const METAL = paleta.indigo;

/** Pernas e travessas sob o telão (estica na largura, traço sem distorcer). */
export function Trelica() {
  const postes = [40, 330, 670, 960];
  return (
    <svg className="trelica" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true">
      <g stroke={METAL} strokeWidth="3" vectorEffect="non-scaling-stroke" fill="none">
        <line x1="0" y1="4" x2="1000" y2="4" vectorEffect="non-scaling-stroke" />
        {postes.map((x) => (
          <g key={x}>
            <line x1={x - 14} y1="4" x2={x - 14} y2="56" vectorEffect="non-scaling-stroke" />
            <line x1={x + 14} y1="4" x2={x + 14} y2="56" vectorEffect="non-scaling-stroke" />
            <line x1={x - 14} y1="4" x2={x + 14} y2="56" vectorEffect="non-scaling-stroke" />
            <line x1={x + 14} y1="4" x2={x - 14} y2="56" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </g>
      {/* cabos de sustentação */}
      <g stroke={SILHUETA} strokeWidth="1.5" vectorEffect="non-scaling-stroke">
        <line x1="26" y1="4" x2="0" y2="56" vectorEffect="non-scaling-stroke" />
        <line x1="974" y1="4" x2="1000" y2="56" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

/** Antena treliçada; a luz do topo pisca no ritmo de aviso aéreo (CSS). */
function Antena() {
  // bordas da torre em y: a esquerda vai de x=27 (topo) a x=10 (base), a direita de 33 a 50
  const borda = (y: number) => ((y - 26) / 294) * 17;
  const niveis = Array.from({ length: 12 }, (_, i) => 26 + i * 26);
  return (
    <svg className="telhado__antena" viewBox="0 0 60 320" aria-hidden="true">
      <g stroke={SILHUETA} strokeWidth="3" fill="none">
        <line x1="10" y1="320" x2="27" y2="26" />
        <line x1="50" y1="320" x2="33" y2="26" />
        {/* travessas em zigue-zague */}
        {niveis.slice(0, -1).map((y, i) => {
          const y2 = niveis[i + 1];
          const de = i % 2 ? 33 + borda(y) : 27 - borda(y);
          const ate = i % 2 ? 27 - borda(y2) : 33 + borda(y2);
          return <line key={y} x1={de} y1={y} x2={ate} y2={y2} strokeWidth="2" />;
        })}
        <line x1="30" y1="26" x2="30" y2="6" strokeWidth="2" />
      </g>
      <line x1="27" y1="26" x2="10" y2="320" stroke={LUZ_LUA} strokeOpacity="0.35" strokeWidth="1" />
      <circle className="telhado__luz" cx="30" cy="6" r="4" fill={paleta.vermelho} />
    </svg>
  );
}

/** Holofote no chão do telhado, com o cone de luz subindo para o telão. */
function Holofote() {
  return (
    <svg className="telhado__holofote" viewBox="0 0 240 320" aria-hidden="true">
      <defs>
        <linearGradient id="cone-holofote" x1="0" y1="1" x2="0.6" y2="0">
          <stop offset="0" stopColor={paleta.creme} stopOpacity="0.13" />
          <stop offset="1" stopColor={paleta.creme} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="40,290 52,282 240,0 130,0" fill="url(#cone-holofote)" />
      <g fill={SILHUETA}>
        <rect x="22" y="282" width="40" height="24" rx="4" transform="rotate(-34 42 294)" />
        <rect x="36" y="300" width="12" height="20" />
      </g>
      <line x1="30" y1="276" x2="58" y2="296" stroke={LUZ_LUA} strokeOpacity="0.4" strokeWidth="1.5" />
    </svg>
  );
}

function CaixaDagua() {
  return (
    <svg className="telhado__caixa" viewBox="0 0 120 170" aria-hidden="true">
      <g fill={SILHUETA}>
        <ellipse cx="60" cy="22" rx="48" ry="12" />
        <rect x="12" y="22" width="96" height="86" />
        <ellipse cx="60" cy="108" rx="48" ry="12" />
      </g>
      {/* aros de metal e a borda que a lua ilumina */}
      <g stroke={METAL} strokeWidth="2" fill="none">
        <path d="M12 50 Q60 64 108 50" />
        <path d="M12 80 Q60 94 108 80" />
      </g>
      <path d="M14 26 L14 104" stroke={LUZ_LUA} strokeOpacity="0.4" strokeWidth="2" />
      <path d="M14 20 Q40 8 80 10" stroke={LUZ_LUA} strokeOpacity="0.45" strokeWidth="2" fill="none" />
      <g stroke={SILHUETA} strokeWidth="5">
        <line x1="24" y1="116" x2="18" y2="170" />
        <line x1="96" y1="116" x2="102" y2="170" />
        <line x1="60" y1="120" x2="60" y2="170" />
      </g>
      <g stroke={SILHUETA} strokeWidth="2">
        <line x1="20" y1="140" x2="100" y2="160" />
        <line x1="100" y1="140" x2="20" y2="160" />
      </g>
      {/* escada lateral */}
      <g stroke={METAL} strokeWidth="1.5">
        <line x1="112" y1="30" x2="112" y2="170" />
        {[44, 62, 80, 98, 116, 134, 152].map((y) => (
          <line key={y} x1="108" y1={y} x2="116" y2={y} />
        ))}
      </g>
    </svg>
  );
}

function Parabolica() {
  return (
    <svg className="telhado__parabolica" viewBox="0 0 110 110" aria-hidden="true">
      <g fill={SILHUETA}>
        <path d="M18 18 Q8 70 62 86 Q84 60 18 18 Z" />
        <rect x="46" y="80" width="8" height="30" />
        <rect x="34" y="104" width="32" height="6" />
      </g>
      <path d="M18 18 Q8 70 62 86" stroke={LUZ_LUA} strokeOpacity="0.5" strokeWidth="2" fill="none" />
      <g stroke={SILHUETA} strokeWidth="2.5">
        <line x1="40" y1="52" x2="72" y2="32" />
        <line x1="60" y1="80" x2="72" y2="32" />
      </g>
      <circle cx="73" cy="31" r="4" fill={METAL} />
    </svg>
  );
}

/** As peças em volta do telão; ficam atrás dele (o telão cobre a parte de baixo). */
export function Telhado() {
  return (
    <div className="telhado" aria-hidden="true">
      <Antena />
      <Holofote />
      <CaixaDagua />
      <Parabolica />
    </div>
  );
}
