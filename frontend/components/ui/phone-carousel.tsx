"use client";

/**
 * Carrossel orbital da página do celular, adaptado do "Dish Orbit Carousel" para
 * o tema Renascença e refeito com motion (sem gsap). Trocar de celular faz o
 * aparelho sair por cima numa órbita larga enquanto o próximo entra pelo outro
 * lado; marca e modelo saem e voltam como cortina (linha fina pela direita,
 * linha grossa pela esquerda); o cartão troca com as linhas subindo em sequência;
 * o arco atrás estica entre os aparelhos e assume a cor do novo.
 *
 * Quem decide qual é o celular atual é a página (a URL); aqui só se desenha e se
 * avisa `onIr`. Setas, miniaturas e deslizar o dedo trocam; a rolagem não.
 * Só o aparelho atual (e o que está saindo) fica montado na órbita.
 */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";
import { Box, MessageSquareText, X } from "lucide-react";
import { CelularTransicao } from "@/components/ui/transicoes";
import { CreditoFoto } from "@/components/ui/phone-photo";
import { PhoneArt } from "@/components/ui/phone-shelf";
import { textoAvaliacoes } from "@/components/ui/rating";
import { sketchfabEmbedUrl, type Celular, type Especificacoes } from "@/src/lib/celulares";

export type Direcao = 1 | -1;

// #region geometria (mesma do original)
/** Pivô da órbita, acima do palco de 960 x 520 (o transform-origin de .orb-orbit). */
const ORBIT_X = 299;
const ORBIT_Y = -450;
const ORBIT_R = 650;
/** Graus que o aparelho percorre em volta do pivô. */
const SWING = 50;
/** Passo e quantidade de miniaturas visíveis na faixa. */
const ITEM = 118;
const VISIVEIS = 4;

/** Onde o arco descansa para cada celular, como [início, fim] em graus ao longo da órbita. */
const ARC_REST = [
  [50, 98],
  [46, 124],
  [60, 126],
  [40, 100],
];
/** O arco no meio da troca: estica entre o aparelho que sai e o que entra. */
const ARC_SWEEP = [38, 146];

/** Cores da paleta Renascença, em rodízio: ouro, siena, verdete, lápis-lazúli. */
const CORES = ["#c9973f", "#b4643a", "#6fa58e", "#6f8fbf"];

function rodizio<T>(lista: T[], i: number): T {
  return lista[((i % lista.length) + lista.length) % lista.length];
}

/**
 * O arco: um traço grosso ao longo do círculo da órbita, afinando nas pontas.
 * Ângulos em graus no espaço da tela (0 = direita, 90 = para baixo).
 */
export function arcPath(a0: number, a1: number, cx: number, cy: number, r: number, w: number, passos = 48): string {
  const fora: string[] = [];
  const dentro: string[] = [];
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    const h = (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.45);
    const c = Math.cos(a);
    const s = Math.sin(a);
    fora.push(`${(cx + c * (r + h)).toFixed(1)} ${(cy + s * (r + h)).toFixed(1)}`);
    dentro.push(`${(cx + c * (r - h)).toFixed(1)} ${(cy + s * (r - h)).toFixed(1)}`);
  }
  return `M${fora.join("L")}L${dentro.reverse().join("L")}Z`;
}

/** Primeira miniatura da janela da faixa, mantendo a atual à vista. */
export function inicioFaixa(indice: number, total: number, visiveis: number): number {
  if (total <= visiveis) return 0;
  return Math.max(0, Math.min(indice - 1, total - visiveis));
}

/** Tamanho da fonte para uma linha de `letras` caber em `largura` px. */
export function tamanhoQueCabe(letras: number, max: number, largura: number, em: number): number {
  return Math.min(max, largura / (Math.max(1, letras) * em));
}
// #endregion

// curvas equivalentes às do gsap usadas no original
const POWER1_IN = [0.47, 0, 0.745, 0.715] as const;
const POWER2_IN = [0.55, 0.085, 0.68, 0.53] as const;
const POWER2_OUT = [0.25, 0.46, 0.45, 0.94] as const;
const POWER2_IN_OUT = [0.455, 0.03, 0.515, 0.955] as const;
const POWER3_OUT = [0.215, 0.61, 0.355, 1] as const;

const ESCONDE_1 = "inset(0% 0% 0% 100%)"; // linha fina: entra pela direita
const ESCONDE_2 = "inset(0% 100% 0% 0%)"; // linha grossa: entra pela esquerda
const MOSTRA = "inset(0% 0% 0% 0%)";

const orbita: Variants = {
  entra: (d: Direcao) => ({ rotate: -SWING * d }),
  fica: { rotate: 0, transition: { duration: 0.95, ease: POWER3_OUT, delay: 0.3 } },
  sai: (d: Direcao) => ({ rotate: SWING * d, transition: { duration: 0.62, ease: POWER2_IN } }),
};

const linha1: Variants = {
  entra: { clipPath: ESCONDE_1 },
  fica: { clipPath: MOSTRA, transition: { duration: 0.7, ease: POWER3_OUT, delay: 0.55 } },
  sai: { clipPath: ESCONDE_1, transition: { duration: 0.42, ease: POWER2_IN } },
};

const linha2: Variants = {
  entra: { clipPath: ESCONDE_2 },
  fica: { clipPath: MOSTRA, transition: { duration: 0.7, ease: POWER3_OUT, delay: 0.62 } },
  sai: { clipPath: ESCONDE_2, transition: { duration: 0.42, ease: POWER2_IN, delay: 0.06 } },
};

const etiqueta: Variants = {
  entra: { opacity: 0, y: 6 },
  fica: { opacity: 1, y: 0, transition: { duration: 0.4, ease: POWER2_OUT, delay: 0.55 } },
  sai: { opacity: 0, transition: { duration: 0.25 } },
};

const corpo: Variants = {
  entra: {},
  fica: { transition: { delayChildren: 0.4, staggerChildren: 0.06 } },
  sai: { opacity: 0, y: -6, transition: { duration: 0.3, ease: POWER1_IN, delay: 0.05 } },
};

const linhaCorpo: Variants = {
  entra: { opacity: 0, y: 10 },
  fica: { opacity: 1, y: 0, transition: { duration: 0.5, ease: POWER2_OUT } },
};

/** Sem movimento: tudo aparece e some na hora. */
const PARADO: Variants = { entra: {}, fica: {}, sai: { opacity: 0, transition: { duration: 0 } } };

/** Faixa de miniaturas: entra depois do nome, na primeira vez que o carrossel aparece. */
const FAIXA_ENTRA = { opacity: 0, y: 12 };
const FAIXA_FICA = { opacity: 1, y: 0, transition: { duration: 0.5, ease: POWER2_OUT, delay: 0.7 } };

const ABAS = ["geral", "ficha"] as const;
type Aba = (typeof ABAS)[number];
const ROTULO_ABA: Record<Aba, string> = { geral: "Visão geral", ficha: "Ficha técnica" };

const DESTAQUES: [keyof Especificacoes, string][] = [
  ["tela", "Tela"],
  ["hardware", "Chip"],
  ["camera", "Câmera"],
  ["bateria", "Bateria"],
];

type Props = {
  celulares: Celular[];
  indice: number;
  direcao: Direcao;
  onIr: (indice: number, direcao: Direcao) => void;
};

export function PhoneCarousel({ celulares, indice, direcao, onIr }: Props) {
  const reduzir = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const abasRef = useRef<Partial<Record<Aba, HTMLButtonElement | null>>>({});
  const idBase = useId();
  const [aba, setAba] = useState<Aba>("geral");
  const total = celulares.length;
  const celular = celulares[indice];
  const cor = rodizio(CORES, indice);

  // encaixa o palco de 960 x 520 no carrossel; só mede quando o tamanho muda
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const encaixa = () => el.style.setProperty("--orb-s", String(Math.min(el.clientWidth / 960, el.clientHeight / 520, 1.6)));
    encaixa();
    const ro = new ResizeObserver(encaixa);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // arco: estica entre os aparelhos e assenta no lugar do novo
  const descanso = rodizio(ARC_REST, indice);
  const a0 = useMotionValue(descanso[0]);
  const a1 = useMotionValue(descanso[1]);
  const d = useTransform(() => arcPath(a0.get(), a1.get(), ORBIT_X, ORBIT_Y, ORBIT_R, 118));
  const primeiro = useRef(true);
  useEffect(() => {
    const [r0, r1] = rodizio(ARC_REST, indice);
    if (primeiro.current || reduzir) {
      primeiro.current = false;
      a0.set(r0);
      a1.set(r1);
      return;
    }
    const opcoes = { duration: 1.45, times: [0, 0.41, 1], ease: [[...POWER2_IN_OUT], [...POWER3_OUT]] as [number, number, number, number][] };
    const c0 = animate(a0, [a0.get(), ARC_SWEEP[0], r0], opcoes);
    const c1 = animate(a1, [a1.get(), ARC_SWEEP[1], r1], opcoes);
    return () => {
      c0.stop();
      c1.stop();
    };
  }, [indice, reduzir, a0, a1]);

  // deixa a foto do vizinho pronta antes de a pessoa clicar
  useEffect(() => {
    for (const vizinho of [celulares[indice - 1], celulares[indice + 1]]) {
      const url = vizinho?.imagens[0]?.url;
      if (url) new Image().src = url;
    }
  }, [celulares, indice]);

  const ir = (para: number, dir?: Direcao) => {
    if (para < 0 || para >= total || para === indice) return;
    onIr(para, dir ?? (para > indice ? 1 : -1));
  };

  const onPointerDown = (e: PointerEvent) => {
    toque.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const t = toque.current;
    toque.current = null;
    if (!t) return;
    const dx = e.clientX - t.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - t.y) * 1.4) ir(indice + (dx < 0 ? 1 : -1));
  };

  // abas no padrão WAI-ARIA: ←/→ circulam, Home/End vão às pontas, a aba segue o foco
  const onTeclaAbas = (e: KeyboardEvent<HTMLDivElement>) => {
    const atual = ABAS.indexOf(aba);
    const destino =
      e.key === "ArrowRight" ? ABAS[(atual + 1) % ABAS.length]
      : e.key === "ArrowLeft" ? ABAS[(atual - 1 + ABAS.length) % ABAS.length]
      : e.key === "Home" ? ABAS[0]
      : e.key === "End" ? ABAS[ABAS.length - 1]
      : null;
    if (!destino) return;
    e.preventDefault();
    e.stopPropagation(); // aqui as setas trocam de aba, não de celular
    setAba(destino);
    abasRef.current[destino]?.focus();
  };

  if (!celular) return null;

  const v = (variantes: Variants) => (reduzir ? PARADO : variantes);
  // a órbita não anima ao montar: a foto chega voando do catálogo (View Transition)
  const presenca = { custom: direcao, initial: false } as const;
  // nome e cartão entram com a mesma cortina da troca, inclusive na primeira vez
  const presencaEntra = { custom: direcao, initial: !reduzir } as const;
  const idPainel = `${idBase}-painel`;
  const idAba = (t: Aba) => `${idBase}-aba-${t}`;
  const animado = { custom: direcao, initial: "entra", animate: "fica", exit: "sai" } as const;
  const inicio = inicioFaixa(indice, total, VISIVEIS);
  const nome = `${celular.marca} ${celular.modelo}`;
  const foto = celular.imagens[0];
  const credito = celular.especificacoes?.creditoImagem;

  return (
    <div className="orb-wrap">
      <div ref={rootRef} className="orb-root" role="region" aria-roledescription="carrossel" aria-label="Celulares do catálogo">
        <div className="orb-canvas">
          <svg className="orb-arc" viewBox="0 0 960 520" aria-hidden="true">
            <motion.path
              d={d}
              style={{ opacity: 0.34 }}
              initial={false}
              animate={{ fill: cor }}
              transition={{ duration: reduzir ? 0 : 1.1, ease: "easeInOut", delay: reduzir ? 0 : 0.1 }}
            />
          </svg>

          <div className="orb-plates" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (toque.current = null)}>
            <AnimatePresence {...presenca}>
              <motion.div key={celular.idcelular} className="orb-orbit" {...animado} variants={v(orbita)}>
                <CelularTransicao id={celular.idcelular}>
                  {foto ? (
                    <div className="orb-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API */}
                      <img src={foto.url} alt={nome} draggable={false} />
                    </div>
                  ) : (
                    <div className="orb-art" role="img" aria-label={nome}>
                      <PhoneArt celular={celular} />
                    </div>
                  )}
                </CelularTransicao>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="orb-head">
            <AnimatePresence {...presencaEntra}>
              <motion.div key={celular.idcelular} className="orb-hd" initial="entra" animate="fica" exit="sai">
                <motion.p className="orb-eye" variants={v(etiqueta)}>
                  Nº {indice + 1} do catálogo
                </motion.p>
                <h1 style={{ margin: 0, font: "inherit" }}>
                  <motion.span
                    className="orb-t1"
                    variants={v(linha1)}
                    style={{ fontSize: tamanhoQueCabe(celular.marca.length, 52, 320, 0.6) }}
                  >
                    {celular.marca}
                  </motion.span>
                  <motion.span
                    className="orb-t2"
                    variants={v(linha2)}
                    style={{ fontSize: tamanhoQueCabe(celular.modelo.length, 60, 320, 0.62) }}
                  >
                    {celular.modelo}
                  </motion.span>
                </h1>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="orb-acts">
            <a href="#comentarios">
              <MessageSquareText size={15} strokeWidth={1.8} aria-hidden="true" />
              Avaliar
            </a>
            {celular.modelo3d && (
              <button type="button" className="orb-btn" onClick={() => dialogRef.current?.showModal()}>
                <Box size={15} strokeWidth={1.8} aria-hidden="true" />
                Ver em 3D
              </button>
            )}
          </div>

          <div className="orb-card">
            <div className="orb-tabs" role="tablist" aria-label="Detalhes do celular" onKeyDown={onTeclaAbas}>
              {ABAS.map((t) => (
                <button
                  key={t}
                  ref={(el) => {
                    abasRef.current[t] = el;
                  }}
                  type="button"
                  role="tab"
                  id={idAba(t)}
                  className="orb-btn orb-tab"
                  aria-selected={aba === t}
                  aria-controls={idPainel}
                  tabIndex={aba === t ? 0 : -1}
                  onClick={() => setAba(t)}
                >
                  {ROTULO_ABA[t]}
                </button>
              ))}
            </div>
            <div className="orb-bodies" role="tabpanel" id={idPainel} aria-labelledby={idAba(aba)} tabIndex={0}>
              <AnimatePresence {...presencaEntra}>
                <motion.div key={celular.idcelular} className="orb-body" {...animado} variants={v(corpo)}>
                  <CorpoCartao celular={celular} aba={aba} cor={cor} variantes={v(linhaCorpo)} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <motion.div className="orb-strip" initial={reduzir ? false : FAIXA_ENTRA} animate={FAIXA_FICA}>
            <button type="button" className="orb-btn orb-arrow" aria-label="Celular anterior" disabled={indice === 0} onClick={() => ir(indice - 1, -1)}>
              <svg viewBox="0 0 12 16" aria-hidden="true">
                <path d="M11 0v16L0 8z" />
              </svg>
            </button>
            <div className="orb-win">
              <ul className="orb-track" style={{ transform: `translateX(${-inicio * ITEM}px)` }}>
                {celulares.map((c, i) => (
                  <li key={c.idcelular} className="orb-th">
                    <button
                      type="button"
                      className="orb-btn"
                      aria-current={i === indice ? "true" : undefined}
                      tabIndex={i >= inicio && i < inicio + VISIVEIS ? 0 : -1}
                      onClick={() => ir(i)}
                    >
                      {c.imagens[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API
                        <img src={c.imagens[0].url} alt="" loading="lazy" draggable={false} />
                      ) : (
                        <span className="orb-th-art" aria-hidden="true">
                          <PhoneArt celular={c} />
                        </span>
                      )}
                      <span>{`${c.marca} ${c.modelo}`}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="orb-count" aria-hidden="true">
              <strong>{String(indice + 1).padStart(2, "0")}</strong>
              <i />
              <span>{String(total).padStart(2, "0")}</span>
            </p>
            <button type="button" className="orb-btn orb-arrow" aria-label="Próximo celular" disabled={indice >= total - 1} onClick={() => ir(indice + 1, 1)}>
              <svg viewBox="0 0 12 16" aria-hidden="true">
                <path d="M1 0v16l11-8z" />
              </svg>
            </button>
          </motion.div>
        </div>
        <p className="orb-sr" aria-live="polite">{`Celular ${indice + 1} de ${total}: ${nome}`}</p>
      </div>

      {/* a primeira foto vem da busca; a licença do Wikimedia exige o crédito e o link da licença */}
      {foto && credito && (
        <p className="orb-credit">
          <CreditoFoto texto={credito} url={celular.especificacoes?.creditoImagemUrl ?? null} />
        </p>
      )}

      {celular.modelo3d && (
        <dialog ref={dialogRef} className="orb-3d" aria-label={`${nome} em 3D`}>
          <header>
            {nome}
            <button type="button" className="orb-btn orb-arrow" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
              <X size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </header>
          <iframe
            title={`${nome} em 3D`}
            src={sketchfabEmbedUrl(celular.modelo3d)}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        </dialog>
      )}
    </div>
  );
}

function CorpoCartao({ celular, aba, cor, variantes }: { celular: Celular; aba: Aba; cor: string; variantes: Variants }) {
  const especificacoes = celular.especificacoes;
  const destaques = especificacoes ? DESTAQUES.filter(([campo]) => especificacoes[campo]) : [];

  return (
    <>
      <motion.div className="orb-rate" variants={variantes}>
        <span className="orb-badge" style={{ background: cor }}>
          <strong aria-label={celular.notaMedia === null ? "Sem nota" : `Nota ${celular.notaMedia.toFixed(1)} de 5`}>
            {celular.notaMedia === null ? "–" : celular.notaMedia.toFixed(1)}
          </strong>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2.5 2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
          </svg>
        </span>
        <p>{celular.avaliacoes > 0 ? textoAvaliacoes(celular.avaliacoes) : "Ainda sem avaliações"}</p>
      </motion.div>
      {aba === "geral" || destaques.length === 0 ? (
        <motion.p className="orb-desc" variants={variantes}>
          {celular.descricao || "Sem descrição. Conte o que achou dele nas avaliações."}
        </motion.p>
      ) : (
        <motion.ul className="orb-chips" variants={variantes}>
          {destaques.map(([campo, rotulo]) => (
            <li key={campo}>
              <small>{rotulo}</small>
              <span title={especificacoes?.[campo] ?? undefined}>{especificacoes?.[campo]}</span>
            </li>
          ))}
        </motion.ul>
      )}
    </>
  );
}
