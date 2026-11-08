"use client";

/**
 * Celular 3D feito só com CSS 3D + motion (sem WebGL).
 * - Gira sozinho devagar (desliga com prefers-reduced-motion).
 * - Arraste com o mouse/dedo para girar; ao soltar mantém a velocidade e desacelera.
 * - Com foco, as setas do teclado também giram.
 */

import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { Camera, MessageCircle, Music2, Smartphone, Star, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

type Phone3DProps = {
  /** Conteúdo da tela. Se omitido, mostra uma tela inicial ilustrativa. */
  screen?: ReactNode;
  /** Conteúdo da traseira (ex.: foto traseira). Se omitido, desenha o módulo de câmeras. */
  back?: ReactNode;
  /** Largura em px; a altura segue a proporção de um smartphone. */
  width?: number;
  frameColor?: string;
  backColor?: string;
  autoRotate?: boolean;
  className?: string;
  label?: string;
};

const DEPTH = 18;
const SLICES = 12;

export function Phone3D({
  screen,
  back,
  width = 260,
  frameColor = "#24252d",
  backColor = "#1b1c24",
  autoRotate = true,
  className,
  label = "Celular 3D. Arraste ou use as setas para girar.",
}: Phone3DProps) {
  const reduce = useReducedMotion();
  const height = Math.round(width * 2.06);
  const radius = Math.round(width * 0.17);

  const rotY = useMotionValue(-22);
  const rotXRaw = useMotionValue(8);
  const rotX = useSpring(rotXRaw, { stiffness: 120, damping: 18 });
  const lift = useMotionValue(0);
  const shadowScale = useTransform(lift, [-10, 10], [1.08, 0.92]);

  const dragging = useRef(false);
  const settling = useRef(false);
  const last = useRef({ x: 0, y: 0, t: 0, vx: 0 });

  useAnimationFrame((time, delta) => {
    if (reduce) return;
    lift.set(Math.sin(time / 900) * 8);
    if (autoRotate && !dragging.current && !settling.current) {
      rotY.set(rotY.get() + delta * 0.018);
    }
  });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    settling.current = false;
    rotY.stop();
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, vx: 0 };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    const dt = Math.max(1, e.timeStamp - last.current.t);
    rotY.set(rotY.get() + dx * 0.5);
    rotXRaw.set(Math.max(-35, Math.min(35, rotXRaw.get() - dy * 0.3)));
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, vx: (dx * 0.5 * 1000) / dt };
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    settling.current = true;
    rotXRaw.set(8);
    animate(rotY, rotY.get(), {
      type: "inertia",
      velocity: last.current.vx,
      power: 0.35,
      timeConstant: 420,
      onComplete: () => {
        settling.current = false;
      },
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 45 : 15;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      settling.current = true;
      animate(rotY, rotY.get() + (e.key === "ArrowRight" ? step : -step), {
        type: "spring",
        bounce: 0,
        duration: 0.5,
        onComplete: () => {
          settling.current = false;
        },
      });
    }
  };

  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: radius,
    backfaceVisibility: "hidden",
  };

  return (
    <div
      role="img"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "relative grid touch-none select-none place-items-center rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        className,
      )}
      style={{ perspective: 1400, width: width * 1.5, height: height * 1.18 }}
    >
      <motion.div
        aria-hidden
        className="absolute bottom-0 rounded-[50%] bg-black/35 blur-xl"
        style={{ width: width * 0.9, height: 26, scaleX: shadowScale }}
      />
      <motion.div
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          width,
          height,
          position: "relative",
          transformStyle: "preserve-3d",
          rotateY: rotY,
          rotateX: rotX,
          y: lift,
        }}
      >
        {/* espessura: fatias empilhadas formam as laterais */}
        {Array.from({ length: SLICES }, (_, i) => {
          const z = -DEPTH / 2 + (DEPTH * i) / (SLICES - 1);
          const shade = 0.75 + 0.25 * Math.abs(Math.sin((i / (SLICES - 1)) * Math.PI));
          return (
            <div
              key={i}
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: radius,
                transform: `translateZ(${z}px)`,
                background: frameColor,
                filter: `brightness(${shade})`,
              }}
            />
          );
        })}

        {/* frente */}
        <div
          style={{
            ...face,
            transform: `translateZ(${DEPTH / 2 + 0.5}px)`,
            background: frameColor,
            padding: Math.max(6, width * 0.035),
            boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.18)",
          }}
        >
          <div
            className="relative size-full overflow-hidden bg-black"
            style={{ borderRadius: radius - width * 0.035 }}
          >
            {screen ?? <DefaultScreen />}
            <div
              aria-hidden
              className="absolute left-1/2 top-[2.2%] h-[3.6%] w-[32%] -translate-x-1/2 rounded-full bg-black"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_38%)]"
            />
          </div>
        </div>

        {/* traseira */}
        <div
          style={{
            ...face,
            transform: `rotateY(180deg) translateZ(${DEPTH / 2 + 0.5}px)`,
            background: `linear-gradient(150deg, ${backColor}, #000 140%)`,
            boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.14)",
            overflow: "hidden",
          }}
        >
          {back ?? <DefaultBack width={width} />}
        </div>
      </motion.div>
    </div>
  );
}

function DefaultScreen() {
  const apps = [
    { Icon: MessageCircle, bg: "#22c55e" },
    { Icon: Camera, bg: "#0f172a" },
    { Icon: Music2, bg: "#ef4444" },
    { Icon: Star, bg: "#f59e0b" },
    { Icon: Wifi, bg: "#0ea5e9" },
    { Icon: Smartphone, bg: "#8b5cf6" },
  ];
  return (
    <div className="relative size-full bg-[radial-gradient(120%_80%_at_20%_10%,#6d7bff_0%,#4c5cf5_30%,#2a1f6b_65%,#0b0b10_100%)] text-white">
      <div className="absolute inset-x-0 top-[12%] text-center">
        <div className="text-[13px] font-medium opacity-80">sábado, 8 de novembro</div>
        <div className="text-[56px] font-semibold leading-none tracking-tight">9:41</div>
      </div>
      <div className="absolute inset-x-[9%] bottom-[16%] grid grid-cols-3 gap-[10%]">
        {apps.map(({ Icon, bg }, i) => (
          <span
            key={i}
            className="grid aspect-square place-items-center rounded-[28%] shadow-lg"
            style={{ background: bg }}
          >
            <Icon className="size-[45%]" strokeWidth={2} />
          </span>
        ))}
      </div>
      <div className="absolute bottom-[3%] left-1/2 h-[0.8%] w-[34%] -translate-x-1/2 rounded-full bg-white/80" />
    </div>
  );
}

function DefaultBack({ width }: { width: number }) {
  const lens = width * 0.13;
  return (
    <div className="relative size-full">
      <div
        className="absolute left-[7%] top-[4%] grid grid-cols-2 gap-[8%] rounded-[30%] bg-white/[0.07] p-[4%] ring-1 ring-white/10 backdrop-blur"
        style={{ width: width * 0.42, height: width * 0.42 }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="grid place-items-center rounded-full bg-[#0a0a0f] ring-[3px] ring-[#3a3b45]"
            style={{ width: lens, height: lens }}
          >
            <span className="size-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#5b6cff,#0b0b10_70%)]" />
          </span>
        ))}
        <span className="m-auto size-3 rounded-full bg-[#fff6d6] shadow-[0_0_10px_#fff6d6]" />
      </div>
      <div className="absolute inset-x-0 bottom-[12%] text-center text-[13px] font-semibold tracking-[0.3em] text-white/50">
        FEEDBACKCELL
      </div>
    </div>
  );
}
