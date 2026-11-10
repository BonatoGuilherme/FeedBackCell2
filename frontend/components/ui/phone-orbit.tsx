"use client";

/**
 * Vitrine com um celular real no centro (sorteado a cada visita), anéis que
 * pulsam e os símbolos dos sistemas e apps de celular girando em órbita.
 * Adaptado da ideia de Ripple + OrbitingCircles (modern-animated-sign-in) para
 * o tema do FeedBackCELL. O celular inclina seguindo o mouse.
 *
 * Tamanhos relativos ao próprio palco (container queries), então funciona em
 * qualquer largura.
 */

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import {
  siAndroid,
  siApple,
  siGoogleplay,
  siHarmonyos,
  siInstagram,
  siSpotify,
  siTelegram,
  siTiktok,
  siWhatsapp,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";
import {
  sortearCelular,
  sortearModelo3d,
  type CelularVitrine,
  type Modelo3dVitrine,
} from "@/src/lib/vitrine";
import dynamic from "next/dynamic";

// three.js só no navegador e carregado sob demanda
const PhoneModel3D = dynamic(() => import("@/components/ui/phone-model-3d"), { ssr: false });
import { cn } from "@/lib/utils";

type Orbita = {
  /** raio em fração da metade do palco (0–1) */
  raio: number;
  duracao: number;
  reverso?: boolean;
  /** tamanho do ícone em fração do palco */
  tamanho: number;
  icones: SimpleIcon[];
};

// sistemas no anel de dentro, apps nos de fora
const ORBITAS: Orbita[] = [
  { raio: 0.5, duracao: 26, tamanho: 0.1, icones: [siAndroid, siApple, siHarmonyos] },
  { raio: 0.72, duracao: 38, reverso: true, tamanho: 0.085, icones: [siWhatsapp, siInstagram, siYoutube, siSpotify] },
  { raio: 0.93, duracao: 52, tamanho: 0.075, icones: [siTelegram, siTiktok, siGoogleplay] },
];

const NOMES: Record<string, string> = {
  Android: "Android",
  Apple: "iOS",
  HarmonyOS: "HarmonyOS",
};

type PhoneOrbitProps = {
  className?: string;
  /** conteúdo extra por cima (ex.: etiquetas flutuantes) */
  children?: ReactNode;
  /** mostra o crédito da foto */
  credito?: boolean;
  /**
   * "foto": celular real em foto, que inclina com o mouse.
   * "3d": modelo 3D real (Sketchfab) numa lente redonda no centro.
   */
  modo?: "foto" | "3d";
};

export function PhoneOrbit({ className, children, credito = true, modo = "foto" }: PhoneOrbitProps) {
  const reduce = useReducedMotion();
  const [celular, setCelular] = useState<CelularVitrine | null>(null);
  const [modelo, setModelo] = useState<Modelo3dVitrine | null>(null);
  const [visorPronto, setVisorPronto] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const palco = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 120, damping: 16 });
  const ry = useSpring(0, { stiffness: 120, damping: 16 });

  // sorteio só no navegador (evita divergência com o HTML do servidor)
  useEffect(() => {
    if (modo === "3d") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sorteio depende do navegador
      setModelo(sortearModelo3d());
    } else {
      setCelular(sortearCelular());
    }
  }, [modo]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse" || !palco.current) return;
    const r = palco.current.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 26);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 18);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <figure className={cn("orbit", className)}>
      <div ref={palco} className="orbit__stage" onPointerMove={onMove} onPointerLeave={onLeave}>
        {/* anéis pulsando */}
        <div className="orbit__ripple" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </div>

        {/* trilhas e ícones em órbita */}
        {ORBITAS.map((o, oi) => (
          <div key={oi} className="orbit__ring" aria-hidden>
            <span className="orbit__path" style={{ "--r": o.raio } as CSSProperties} />
            {o.icones.map((icone, ii) => (
              <span
                key={icone.slug}
                className={cn("orbit__item", o.reverso && "orbit__item--reverse")}
                style={
                  {
                    "--r": o.raio,
                    "--size": o.tamanho,
                    "--duration": `${o.duracao}s`,
                    "--delay": `${-(o.duracao / o.icones.length) * ii}s`,
                  } as CSSProperties
                }
                title={NOMES[icone.title] ?? icone.title}
              >
                <svg viewBox="0 0 24 24" role="img" aria-label={icone.title}>
                  <path d={icone.path} />
                </svg>
              </span>
            ))}
          </div>
        ))}

        <div className="orbit__glow" aria-hidden />

        {/* modelo 3D real (.glb local), fundo transparente */}
        {modo === "3d" && modelo && (
          <div className={cn("orbit__model", visorPronto && "is-ready")}>
            <PhoneModel3D
              url={modelo.arquivo}
              label={`${modelo.nome} em 3D. Arraste para girar.`}
              reduzirMovimento={!!reduce}
              onPronto={() => setVisorPronto(true)}
              className="size-full"
            />
          </div>
        )}

        {/* celular real */}
        {modo === "foto" && (
        <motion.div
          className="orbit__phone"
          style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        >
          {celular && (
            <motion.img
              key={celular.id}
              src={celular.src}
              alt={celular.nome}
              decoding="async"
              onLoad={() => setCarregado(true)}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, rotateY: -35, scale: 0.92 }}
              animate={carregado ? { opacity: 1, y: 0, rotateY: 0, scale: 1 } : undefined}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              style={{ aspectRatio: celular.proporcao, clipPath: celular.recorte }}
            />
          )}
        </motion.div>
        )}

        {children}
      </div>

      {credito && modo === "3d" && modelo && (
        <figcaption className="orbit__credit">
          {modelo.nome} em 3D · modelo{" "}
          <a href={modelo.pagina} target="_blank" rel="noreferrer">
            {modelo.autor}, CC BY
          </a>
        </figcaption>
      )}
      {credito && modo === "foto" && celular && (
        <figcaption className="orbit__credit">
          {celular.nome} · foto{" "}
          <a href={celular.pagina} target="_blank" rel="noreferrer">
            {celular.autor}, {celular.licenca}
          </a>
        </figcaption>
      )}
    </figure>
  );
}
