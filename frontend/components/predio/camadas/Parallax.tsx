"use client";

/**
 * Camada que se move mais devagar que a rolagem (parallax). `velocidade` 1
 * acompanha a página; 0,25 sobe 25 px a cada 100 px rolados. Só mexe em
 * `transform` (motion), e fica parada com prefers-reduced-motion.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/** Até onde o deslocamento é calculado (o topo tem ~150vh; depois disso ele já saiu da tela). */
const ALCANCE = 2400;

export function Parallax({
  velocidade,
  className,
  children,
}: {
  velocidade: number;
  className?: string;
  children: ReactNode;
}) {
  const parado = useReducedMotion();
  const { scrollY } = useScroll();
  // a camada desce (1 - velocidade) px por px rolado: na tela, sobe só `velocidade`
  const y = useTransform(scrollY, [0, ALCANCE], [0, ALCANCE * (1 - velocidade)]);
  return (
    <motion.div className={cn("camada", className)} style={parado ? undefined : { y }} aria-hidden="true">
      {children}
    </motion.div>
  );
}
