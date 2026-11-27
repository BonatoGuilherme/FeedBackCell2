"use client";

/**
 * Entrada em sequência: os filhos <RevealItem> aparecem um por vez
 * (sobem como placas sendo penduradas) quando entram na tela. Sem desfoque: filtros
 * animados deixam a troca de página lenta e borrada.
 * Com prefers-reduced-motion só fazem fade (MotionConfig reducedMotion="user").
 */

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { motion, type Variants } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** intervalo entre um item e o próximo (s) */
  stagger?: number;
  delay?: number;
  as?: "div" | "ul" | "ol" | "section";
  /** anima ao montar em vez de esperar entrar na tela */
  immediate?: boolean;
} & Omit<ComponentPropsWithoutRef<"div">, "children">;

export function Reveal({
  children,
  className,
  stagger = 0.05,
  delay = 0,
  as = "div",
  immediate = false,
  ...rest
}: RevealProps) {
  const Comp = motion[as] as ElementType;
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  const trigger = immediate
    ? { animate: "show" }
    : { whileInView: "show", viewport: { once: true, margin: "0px 0px -8% 0px" } };

  return (
    <Comp className={className} variants={variants} initial="hidden" {...trigger} {...rest}>
      {children}
    </Comp>
  );
}

type RevealItemProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
} & Omit<ComponentPropsWithoutRef<"div">, "children">;

export function RevealItem({ children, className, as = "div", ...rest }: RevealItemProps) {
  const Comp = motion[as] as ElementType;
  // com prefers-reduced-motion o MotionConfig (AuthLayout) tira o deslocamento e fica só o fade
  const variants: Variants = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <Comp className={className} variants={variants} {...rest}>
      {children}
    </Comp>
  );
}
