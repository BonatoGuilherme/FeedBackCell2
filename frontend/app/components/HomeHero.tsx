"use client";

/**
 * Destaque da página inicial no estilo "Letreiro": cidade noturna cartoon ao
 * fundo (hero/cidade-fundo.tsx, com o telão de rua) e placas verticais acesas.
 * À direita, um celular-outdoor mostra os últimos aparelhos do catálogo de verdade (com estados de carregando, vazio e erro).
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
import CidadeFundo from "./hero/cidade-fundo";

const EASE = [0.16, 1, 0.3, 1] as const;
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Placas verticais: texto decorativo (aria-hidden) e velocidade do parallax. */
const PLACAS = [
  { texto: "スマホ図鑑", className: "vsign--3", velocidade: -60 },
  { texto: "携帯の仕様と評価", className: "vsign--1", velocidade: -140 },
  { texto: "写真あり", className: "vsign--2", velocidade: -90 },
  { texto: "営業中", className: "vsign--4", velocidade: -40 },
];

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
      <CidadeFundo />

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
