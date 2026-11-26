"use client";

/**
 * Destaque da página inicial no estilo "Letreiro": rua à noite com prédios,
 * chuva e placas verticais acesas. À direita, um celular-outdoor mostra os
 * últimos aparelhos do catálogo de verdade (com estados de carregando, vazio e erro).
 * O outdoor é decorativo (aria-hidden): os mesmos aparelhos aparecem, com link,
 * na seção de cartões logo abaixo.
 * As placas sobem em velocidades diferentes ao rolar (parallax), exceto com
 * prefers-reduced-motion.
 */

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Plus } from "lucide-react";
import { useHasSession } from "@/src/lib/useSession";
import { hrefProtegido } from "@/src/lib/rotas";
import { textoAvaliacoes } from "@/components/ui/rating";
import { PhoneArt } from "@/components/ui/phone-shelf";
import { useResumoCatalogo } from "./HomeStats";

const EASE = [0.16, 1, 0.3, 1] as const;
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Placas verticais: texto decorativo (aria-hidden) e velocidade do parallax. */
const PLACAS = [
  { texto: "スマホ図鑑", className: "vsign--3", velocidade: -60 },
  { texto: "携帯の仕様と評価", className: "vsign--1", velocidade: -140 },
  { texto: "写真あり", className: "vsign--2", velocidade: -90 },
  { texto: "営業中", className: "vsign--4", velocidade: -40 },
];

// prédios ao fundo: JSX estático, criado uma vez só (fora do componente)
const CIDADE = (
  <div className="street-hero__city" aria-hidden>
    <svg viewBox="0 0 1440 500" preserveAspectRatio="xMidYMax slice">
      <path
        fill="#3d2f8c"
        d="M0 500V210h80v-70h60v360h20V120h90v380h40V250h70v250h30V90h80v410h40V200h110v300h30V150h60v-40h40v390h40V230h90v270h30V70h70v430h40V180h80v320h40V260h60v-60h50v300h40V140h90v360z"
      />
    </svg>
    <svg viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">
      <path
        fill="#271d66"
        d="M0 400V200h120v200h30V120h110v280h50V230h80v170h40V160h90v240h40V260h120v140h40V110h70v290h40V210h100v190h40V150h80v250h50V240h90v160h40V180h100v220z"
      />
      <g fill="#dcff2e">
        <rect x="1000" y="190" width="14" height="6" />
        <rect x="1240" y="270" width="14" height="6" />
      </g>
      <g fill="#ff2d8a">
        <rect x="760" y="130" width="12" height="120" />
        <rect x="1150" y="170" width="12" height="70" />
      </g>
      <rect x="890" y="230" width="50" height="10" fill="#22d8f2" />
    </svg>
  </div>
);

function Placa({ texto, className, velocidade, indice }: (typeof PLACAS)[number] & { indice: number }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, reduce ? 0 : velocidade]);
  return (
    <motion.div
      className={`vsign ${className}`}
      style={{ y }}
      initial={{ opacity: 0, translateY: "-30%" }}
      animate={{ opacity: 1, translateY: "0%" }}
      transition={{ duration: 0.7, delay: 0.15 + indice * 0.09, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {texto}
    </motion.div>
  );
}

function Outdoor() {
  const { estado, celulares } = useResumoCatalogo();
  const itens = celulares.slice(0, 4);

  return (
    <div className="billboard">
      <div className="billboard__screen">
        <p className="billboard__title">Catálogo</p>
        <span className="billboard__search">Buscar marca ou modelo</span>
        {estado === "carregando" &&
          Array.from({ length: 4 }, (_, i) => <span key={i} className="billboard__item billboard__item--skeleton" />)}
        {estado === "erro" && <p className="billboard__note">O catálogo está fora do ar agora. Tente de novo daqui a pouco.</p>}
        {estado === "pronto" && itens.length === 0 && (
          <p className="billboard__note">Nenhum celular ainda. Cadastre o primeiro!</p>
        )}
        {itens.map((c) => (
          <span key={c.idcelular} className="billboard__item">
            <span className="billboard__thumb">
              {c.imagens[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API
                <img src={c.imagens[0].url} alt="" loading="lazy" />
              ) : (
                <PhoneArt celular={c} />
              )}
            </span>
            <span className="min-w-0">
              <b>{c.modelo}</b>
              <small>{c.marca}</small>
            </span>
            <em title={c.avaliacoes ? textoAvaliacoes(c.avaliacoes) : "sem avaliações"}>
              {c.notaMedia !== null && c.avaliacoes ? decimal.format(c.notaMedia) : "—"}
            </em>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HomeHero() {
  const logado = useHasSession();
  // com movimento reduzido o MotionConfig (AuthLayout) tira os deslocamentos e deixa só o fade
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <section className="street-hero" aria-labelledby="home-title">
      <div className="street-hero__moon" aria-hidden />
      {CIDADE}
      <div className="street-hero__fog" aria-hidden />
      <div className="street-hero__rain" aria-hidden />

      <div className="street-hero__grid">
        <div>
          <motion.p className="kicker" {...rise(0.1)}>
            Catálogo colaborativo de celulares
          </motion.p>
          <h1 id="home-title" className="street-hero__title glitch-once">
            FeedBack<span className="l2">CELL</span>
            <span className="l3">fichas, fotos e notas de celulares</span>
          </h1>
          <motion.p className="street-hero__lede" {...rise(0.2)}>
            Informe marca e modelo e o FeedBackCELL completa a ficha técnica e a foto. Depois, quem usa o aparelho conta o
            que achou e dá uma nota.
          </motion.p>
          <motion.div className="btns" {...rise(0.3)}>
            <Link className="btn-sign btn-sign--primary" href="/catalogo">
              Ver o catálogo
              <ArrowRight className="size-6" strokeWidth={2.4} aria-hidden />
            </Link>
            <Link className="btn-sign" href={hrefProtegido("/items/new", logado)}>
              <Plus className="size-6" strokeWidth={2.4} aria-hidden />
              Adicionar celular
            </Link>
          </motion.div>
        </div>

        <div className="street-hero__street">
          <div aria-hidden>
            {PLACAS.map((p, i) => (
              <Placa key={p.texto} {...p} indice={i} />
            ))}
          </div>
          <motion.div
            className="street-hero__billboard"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            aria-hidden
          >
            <Outdoor />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
