"use client";

/**
 * Cartões de celular no estilo "Letreiro": faixa colorida com a marca, o
 * aparelho sobre fundo noturno (a foto; sem foto, um celular desenhado de costas),
 * o modelo em letra condensada e a nota grande em verde-limão.
 * Clicar abre a página do aparelho (/catalogo/ID).
 */

import Link from "next/link";
import { textoAvaliacoes } from "@/components/ui/rating";
import { CelularTransicao } from "@/components/ui/transicoes";
import { cn } from "@/lib/utils";
import { type Celular, type Especificacoes } from "@/src/lib/celulares";

/** Especificações mostradas na página do aparelho, na ordem. */
export const ROTULOS_ESPECIFICACOES: [keyof Especificacoes, string][] = [
  ["lancamento", "Lançamento"],
  ["precoEstimado", "Preço de lançamento"],
  ["tela", "Tela"],
  ["hardware", "Hardware"],
  ["armazenamento", "Armazenamento"],
  ["camera", "Câmera"],
  ["bateria", "Bateria"],
  ["peso", "Peso"],
  ["espessura", "Espessura"],
];

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Cor da faixa da marca: a mesma marca sempre cai na mesma placa. */
const FAIXAS = ["faixa-pink", "faixa-cyan", "faixa-cream", "faixa-violet", "faixa-lime"] as const;
const faixaDe = (c: Celular) => FAIXAS[hash(c.marca.trim().toLowerCase()) % FAIXAS.length];

export function rotuloAcessivel(c: Celular) {
  const nota =
    c.notaMedia === null || c.avaliacoes === 0
      ? "sem avaliações"
      : `nota ${c.notaMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5, ${textoAvaliacoes(c.avaliacoes)}`;
  return `${c.marca} ${c.modelo}, ${nota}`;
}

type PhoneShelfProps = {
  celulares: Celular[];
  className?: string;
};

export function PhoneShelf({ celulares, className }: PhoneShelfProps) {
  return (
    <ul className={cn("letreiro-cards", className)}>
      {celulares.map((c) => (
        <li key={c.idcelular}>
          <PhoneCard celular={c} />
        </li>
      ))}
    </ul>
  );
}

/** Cartão completo: faixa da marca, aparelho, modelo, nota e descrição. */
export function PhoneCard({ celular: c }: { celular: Celular }) {
  const temNota = c.notaMedia !== null && c.avaliacoes > 0;
  return (
    <Link href={`/catalogo/${c.idcelular}`} aria-label={rotuloAcessivel(c)} className="letreiro-card">
      <span className={cn("letreiro-card__band", faixaDe(c))}>
        <span className="truncate">{c.marca}</span>
        {c.imagens.length > 1 && <span className="letreiro-card__count">{c.imagens.length} fotos</span>}
      </span>
      <span className="letreiro-card__fig">
        <span className="letreiro-card__device">
          <CelularTransicao id={c.idcelular}>
            <PhoneVisual celular={c} />
          </CelularTransicao>
        </span>
      </span>
      <span className="letreiro-card__body">
        <span className="letreiro-card__model" title={c.modelo}>
          {c.modelo}
        </span>
        <span className="letreiro-card__rate">
          {temNota ? decimal.format(c.notaMedia as number) : "—"}
          <small>{temNota ? textoAvaliacoes(c.avaliacoes) : "sem nota"}</small>
        </span>
        {c.descricao && <span className="letreiro-card__desc">{c.descricao}</span>}
      </span>
    </Link>
  );
}

/**
 * Cartão pequeno com marca, modelo e nota, usado na faixa "Mais da marca" da
 * página do celular. Sem nome de transição: só a foto principal voa entre o
 * catálogo e o celular.
 */
export function PhoneMiniCard({ celular }: { celular: Celular }) {
  const temNota = celular.notaMedia !== null && celular.avaliacoes > 0;
  return (
    <Link href={`/catalogo/${celular.idcelular}`} aria-label={rotuloAcessivel(celular)} className="letreiro-mini">
      <span className="letreiro-mini__device">
        <PhoneVisual celular={celular} />
      </span>
      <span className="min-w-0 self-stretch text-center">
        <span className="letreiro-mini__brand" title={celular.marca}>
          {celular.marca}
        </span>
        <span className="letreiro-mini__model" title={celular.modelo}>
          {celular.modelo}
        </span>
        <span className="letreiro-mini__rate">{temNota ? decimal.format(celular.notaMedia as number) : "sem nota"}</span>
      </span>
    </Link>
  );
}

/**
 * A foto do aparelho (da API ou enviada) num cartão do tamanho do celular
 * desenhado; sem foto, o celular desenhado.
 */
function PhoneVisual({ celular, src = celular.imagens[0]?.url }: { celular: Celular; src?: string }) {
  if (src) {
    return (
      <span className="phone-visual">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API */}
        <img src={src} alt="" loading="lazy" className="foto-aparelho size-full object-contain" />
      </span>
    );
  }
  return <PhoneArt celular={celular} />;
}

/** Cores chapadas do corpo, da lateral e do módulo de câmera (paleta do letreiro). */
const CORPOS = [
  { corpo: "#ff8fc4", lado: "#ff6fb2", modulo: "#ffb3d6", lente: "#22d8f2" },
  { corpo: "#22d8f2", lado: "#14b7d0", modulo: "#7beafa", lente: "#ff2d8a" },
  { corpo: "#dcff2e", lado: "#b9db17", modulo: "#0d0b22", lente: "#2b2070" },
  { corpo: "#fff6e0", lado: "#e9dcb8", modulo: "#0d0b22", lente: "#6b4cff" },
  { corpo: "#8f78ff", lado: "#6b4cff", modulo: "#b9abff", lente: "#dcff2e" },
];

/** Celular de costas, desenhado em SVG com cor chapada (para aparelhos sem foto). */
export function PhoneArt({ celular }: { celular: Celular }) {
  const cor = CORPOS[hash(celular.marca.trim().toLowerCase()) % CORPOS.length];
  const desenho = hash(celular.modelo.toLowerCase()) % 3;
  return (
    <svg className="phone-art" viewBox="0 0 120 240" aria-hidden="true">
      <rect x="4" y="4" width="112" height="232" rx="20" fill={cor.corpo} />
      <rect x="96" y="4" width="20" height="232" rx="10" fill={cor.lado} />
      {desenho === 0 && (
        <g>
          <rect x="14" y="14" width="46" height="46" rx="13" fill={cor.modulo} />
          <circle cx="27" cy="27" r="9" fill="#0d0b22" />
          <circle cx="47" cy="47" r="9" fill="#0d0b22" />
          <circle cx="47" cy="27" r="3.5" fill="#fff6e0" />
          <circle cx="29" cy="25" r="3" fill={cor.lente} />
          <circle cx="49" cy="45" r="3" fill={cor.lente} />
        </g>
      )}
      {desenho === 1 && (
        <g>
          <circle cx="24" cy="26" r="9" fill="#0d0b22" />
          <circle cx="24" cy="48" r="9" fill="#0d0b22" />
          <circle cx="24" cy="70" r="9" fill="#0d0b22" />
          <circle cx="42" cy="26" r="3.5" fill="#fff6e0" />
          <circle cx="26" cy="24" r="3" fill={cor.lente} />
          <circle cx="26" cy="46" r="3" fill={cor.lente} />
          <circle cx="26" cy="68" r="3" fill={cor.lente} />
        </g>
      )}
      {desenho === 2 && (
        <g>
          <rect x="4" y="40" width="112" height="24" rx="12" fill="#0d0b22" />
          <circle cx="30" cy="52" r="7" fill={cor.lente} />
          <circle cx="52" cy="52" r="7" fill={cor.lente} />
          <circle cx="80" cy="52" r="3" fill="#fff6e0" />
        </g>
      )}
    </svg>
  );
}
