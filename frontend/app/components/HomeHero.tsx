"use client";

/**
 * Destaque da página inicial: texto à esquerda e, à direita, um celular real
 * (sorteado a cada visita) com sistemas e apps em órbita e etiquetas de
 * especificação flutuando em volta em profundidade.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Box, Camera, Cpu, Plus } from "lucide-react";
import { PhoneOrbit } from "@/components/ui/phone-orbit";


const EASE = [0.16, 1, 0.3, 1] as const;

const chips = [
  { icon: Cpu, label: "Especificações", value: "11 campos", className: "hero-chip--a" },
  { icon: Camera, label: "Foto em alta", value: "HD", className: "hero-chip--b" },
  { icon: Box, label: "Modelo 3D", value: "interativo", className: "hero-chip--c" },
];

export default function HomeHero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: delay * 0.6, ease: EASE },
        };

  return (
    <section className="hero card" aria-labelledby="home-title">
      <div className="hero__copy">
        <motion.p className="hero__eyebrow" {...rise(0.05)}>
          <span aria-hidden>❦</span> Códice colaborativo de celulares
        </motion.p>
        <motion.h1 id="home-title" {...rise(0.15)}>
          O catálogo de celulares que <em>se preenche sozinho.</em>
        </motion.h1>
        <motion.p className="hero__lead" {...rise(0.28)}>
          Informe marca e modelo e o FeedBackCELL completa as especificações, a foto em alta
          resolução e o modelo 3D. Depois, quem usa o aparelho conta o que achou.
        </motion.p>
        <motion.div className="hero__actions" {...rise(0.4)}>
          <Link className="button button--primary hero__cta" href="/catalog">
            Ver o catálogo
            <ArrowRight size={17} strokeWidth={1.8} aria-hidden />
          </Link>
          <Link className="button button--secondary hero__cta" href="/items/new">
            <Plus size={17} strokeWidth={1.8} aria-hidden />
            Adicionar celular
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="hero-stage"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotateY: -25 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
      >
        <PhoneOrbit className="hero-stage__orbit" modo="3d">
          {chips.map(({ icon: Icon, label, value, className }) => (
            <span key={label} className={`hero-chip ${className}`} aria-hidden>
              <Icon size={15} strokeWidth={1.8} />
              <span>
                {label}
                <strong>{value}</strong>
              </span>
            </span>
          ))}
        </PhoneOrbit>
      </motion.div>
    </section>
  );
}
