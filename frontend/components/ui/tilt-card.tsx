"use client";

/**
 * Card de vidro que inclina em 3D seguindo o mouse, com um reflexo de luz
 * que acompanha o cursor. No toque ou com prefers-reduced-motion fica parado.
 */

import { useRef, type ComponentPropsWithoutRef, type PointerEvent } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

type TiltCardProps = ComponentPropsWithoutRef<"div"> & {
  /** inclinação máxima em graus */
  max?: number;
  /** quanto o card "levanta" em direção à tela ao passar o mouse (px) */
  lift?: number;
  /** desenha o reflexo de luz */
  glare?: boolean;
};

const SPRING = { stiffness: 220, damping: 20, mass: 0.6 };

export function TiltCard({
  max = 8,
  lift = 18,
  glare = true,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  style,
  ...rest
}: TiltCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, SPRING);
  const ry = useSpring(0, SPRING);
  const z = useSpring(0, SPRING);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgb(255 236 200 / 14%), transparent 45%)`;

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    z.set(lift);
    gx.set(px * 100);
    gy.set(py * 100);
  };

  const handleLeave = (e: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e);
    rx.set(0);
    ry.set(0);
    z.set(0);
  };

  return (
    <div className="tilt-scene">
      <motion.div
        ref={ref}
        className={cn("tilt-card", className)}
        style={{ ...style, rotateX: rx, rotateY: ry, z, transformPerspective: 900 }}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        {...(rest as object)}
      >
        {children}
        {glare && !reduce && (
          <motion.span className="tilt-card__glare" style={{ background: glareBg }} aria-hidden />
        )}
      </motion.div>
    </div>
  );
}
