"use client";

/**
 * Celular realista em WebGL (three.js + React Three Fiber).
 * Corpo metálico com cantos arredondados, vidro frontal e traseiro, ilha dinâmica,
 * módulo de três câmeras e reflexos de estúdio gerados localmente (sem baixar HDR).
 * Gira sozinho, e dá para arrastar com o mouse/dedo (com inércia).
 * Sem WebGL, cai para o celular em CSS 3D.
 */

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { Phone3D } from "@/components/ui/phone-3d";
import { cn } from "@/lib/utils";

// medidas em unidades da cena (proporção de um smartphone de 6,1")
const W = 0.74; // W/H = 1/2, igual ao celular 2D da prateleira
const H = 1.48;
const D = 0.078;
const R = 0.11;
const BEVEL = 0.014;
const FACE_W = W - 2 * BEVEL;
const FACE_H = H - 2 * BEVEL;
const FACE_R = R - BEVEL;
const SCREEN_W = FACE_W - 0.034;
const SCREEN_H = FACE_H - 0.034;
const SCREEN_R = FACE_R - 0.017;

type PhoneRealProps = {
  /** URL da foto mostrada na tela. Sem foto, mostra uma tela inicial. */
  screenImage?: string;
  frameColor?: string;
  backColor?: string;
  autoRotate?: boolean;
  className?: string;
  label?: string;
};

export function PhoneReal({
  screenImage,
  frameColor = "#3a3b42",
  backColor = "#2a2b33",
  autoRotate = true,
  className,
  label = "Celular em 3D. Arraste para girar.",
}: PhoneRealProps) {
  const reduce = useReducedMotion();

  return (
    <div role="img" aria-label={label} className={cn("relative touch-none select-none", className)}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.05, 3.6], fov: 30, near: 1, far: 12 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        fallback={<Phone3D width={200} screen={screenImage ? <FallbackImage src={screenImage} /> : undefined} />}
        className="!cursor-grab active:!cursor-grabbing"
      >
        <Suspense fallback={null}>
          <Pose floating={!reduce}>
            <PhoneModel screenImage={screenImage} frameColor={frameColor} backColor={backColor} />
          </Pose>
          <ContactShadows position={[0, -0.84, 0]} opacity={0.4} scale={2.4} blur={2.4} far={1.2} />
          <Studio />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.8}
          autoRotate={autoRotate && !reduce}
          autoRotateSpeed={1.4}
          minPolarAngle={Math.PI / 2 - 0.55}
          maxPolarAngle={Math.PI / 2 + 0.45}
        />
      </Canvas>
    </div>
  );
}

const POSE = { x: 0.06, y: -0.45, z: 0.02 };

/** Pose inclinada + flutuação leve (sobe e desce, balança um pouco). */
function Pose({ children, floating }: { children: ReactNode; floating: boolean }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const f = floating ? 1 : 0;
    const w = state.clock.elapsedTime * 0.4;
    g.rotation.set(
      POSE.x + Math.cos(w) * 0.031 * f,
      POSE.y + Math.sin(w) * 0.031 * f,
      POSE.z + Math.sin(w) * 0.0125 * f,
    );
    g.position.y = Math.sin(w) * 0.06 * f;
  });

  return <group ref={ref}>{children}</group>;
}

function FallbackImage({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- fallback sem WebGL
  return <img src={src} alt="" className="size-full object-cover" />;
}

/** Luz de estúdio: softboxes que geram os reflexos no metal e no vidro. */
function Studio() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 2.5, 3]} scale={[6, 1.4, 1]} />
        <Lightformer form="rect" intensity={2} position={[-3, 0.5, 1]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[3, -0.5, 1]} rotation-y={-Math.PI / 2} scale={[4, 1.2, 1]} />
        <Lightformer form="ring" color="#8b9bff" intensity={1.2} position={[0, -2, -3]} scale={2.5} />
      </Environment>
    </>
  );
}

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Corpo: retângulo arredondado extrudado com chanfro fino nas bordas. */
function bodyGeometry() {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(FACE_W, FACE_H, FACE_R), {
    depth: D - 2 * BEVEL,
    bevelEnabled: true,
    bevelSize: BEVEL,
    bevelThickness: BEVEL,
    bevelSegments: 10,
    curveSegments: 32,
  });
  geo.translate(0, 0, -(D - 2 * BEVEL) / 2);
  geo.computeVertexNormals();
  return geo;
}

function roundedRectGeometry(w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  const geo = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 32);
  // UV de 0 a 1 em toda a tela, para a foto ocupar o retângulo inteiro
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - y) / h;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Tela inicial desenhada num canvas (gradiente + relógio + ícones). */
function homeScreenTexture() {
  const c = document.createElement("canvas");
  c.width = 540;
  c.height = 1170;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(140, 160, 40, 270, 500, 1100);
  grad.addColorStop(0, "#7d8aff");
  grad.addColorStop(0.3, "#4c5cf5");
  grad.addColorStop(0.65, "#2a1f6b");
  grad.addColorStop(1, "#07070b");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.textAlign = "center";
  g.font = "500 28px system-ui, sans-serif";
  g.fillText("sábado, 8 de novembro", 270, 190);
  g.fillStyle = "#fff";
  g.font = "600 150px system-ui, sans-serif";
  g.fillText("9:41", 270, 330);
  const colors = ["#22c55e", "#0f172a", "#ef4444", "#f59e0b", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6"];
  colors.forEach((color, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 60 + col * 112;
    const y = 820 + row * 130;
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x, y, 84, 84, 22);
    g.fill();
  });
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.beginPath();
  g.roundRect(180, 1128, 180, 9, 5);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Carrega a foto e recorta como object-fit: cover na proporção da tela. */
function useScreenTexture(src?: string) {
  const [photo, setPhoto] = useState<{ src: string; tex: THREE.Texture } | null>(null);
  const home = useMemo(() => homeScreenTexture(), []);

  useEffect(() => {
    if (!src) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive) return;
      // desenha sobre fundo preto (remove transparência) recortando como object-fit: cover
      const cw = 720;
      const ch = Math.round(cw * (SCREEN_H / SCREEN_W));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const g = canvas.getContext("2d")!;
      g.fillStyle = "#000";
      g.fillRect(0, 0, cw, ch);
      const scale = Math.max(cw / img.width, ch / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      g.imageSmoothingQuality = "high";
      g.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      setPhoto({ src, tex });
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => () => photo?.tex.dispose(), [photo]);
  useEffect(() => () => home.dispose(), [home]);

  return src && photo?.src === src ? photo.tex : home;
}

function PhoneModel({
  screenImage,
  frameColor,
  backColor,
}: {
  screenImage?: string;
  frameColor: string;
  backColor: string;
}) {
  const screenTex = useScreenTexture(screenImage);
  const screenGeo = useMemo(() => roundedRectGeometry(SCREEN_W, SCREEN_H, SCREEN_R), []);
  const glassGeo = useMemo(() => roundedRectGeometry(FACE_W, FACE_H, FACE_R), []);
  const bodyGeo = useMemo(() => bodyGeometry(), []);
  useEffect(() => () => {
    screenGeo.dispose();
    glassGeo.dispose();
    bodyGeo.dispose();
  }, [screenGeo, glassGeo, bodyGeo]);

  const z = D / 2;
  const lens = (x: number, y: number) => (
    <group position={[x, y, -z - 0.03]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.068, 0.068, 0.022, 48]} />
        <meshStandardMaterial color="#9a9ca6" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.0115, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.002, 48]} />
        <meshPhysicalMaterial color="#05060a" metalness={0.2} roughness={0.05} clearcoat={1} />
      </mesh>
      <mesh position={[0, -0.0125, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.001, 32]} />
        <meshStandardMaterial color="#1d2a6b" emissive="#1a2470" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* moldura de metal */}
      <mesh geometry={bodyGeo}>
        <meshPhysicalMaterial color={frameColor} metalness={0.95} roughness={0.22} clearcoat={0.6} clearcoatRoughness={0.15} />
      </mesh>

      {/* vidro frontal (preto) e tela */}
      <mesh geometry={glassGeo} position={[0, 0, z + 0.001]}>
        <meshPhysicalMaterial color="#050507" roughness={0.04} metalness={0.1} clearcoat={1} />
      </mesh>
      <mesh geometry={screenGeo} position={[0, 0, z + 0.005]}>
        <meshBasicMaterial map={screenTex} toneMapped={false} />
      </mesh>
      {/* reflexo do vidro por cima da tela */}
      <mesh geometry={glassGeo} position={[0, 0, z + 0.009]}>
        <meshPhysicalMaterial transparent opacity={0.12} roughness={0.02} metalness={0} clearcoat={1} color="#ffffff" />
      </mesh>
      {/* ilha dinâmica */}
      <RoundedBox args={[0.19, 0.055, 0.004]} radius={0.0019} position={[0, H / 2 - 0.075, z + 0.008]}>
        <meshStandardMaterial color="#000" roughness={0.3} />
      </RoundedBox>

      {/* vidro traseiro */}
      <mesh geometry={glassGeo} position={[0, 0, -z - 0.002]} rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial color={backColor} roughness={0.38} metalness={0.15} clearcoat={0.8} clearcoatRoughness={0.4} />
      </mesh>

      {/* módulo de câmeras */}
      <RoundedBox args={[0.34, 0.34, 0.03]} radius={0.012} smoothness={6} position={[-W / 2 + 0.215, H / 2 - 0.215, -z - 0.012]}>
        <meshPhysicalMaterial color={backColor} roughness={0.15} metalness={0.4} clearcoat={1} />
      </RoundedBox>
      {lens(-W / 2 + 0.135, H / 2 - 0.135)}
      {lens(-W / 2 + 0.135, H / 2 - 0.295)}
      {lens(-W / 2 + 0.295, H / 2 - 0.215)}
      <mesh position={[-W / 2 + 0.3, H / 2 - 0.105, -z - 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.004, 24]} />
        <meshStandardMaterial color="#fff7dc" emissive="#fff1c4" emissiveIntensity={0.3} />
      </mesh>

      {/* botões laterais */}
      <RoundedBox args={[0.012, 0.22, 0.03]} radius={0.005} position={[W / 2 + 0.003, 0.22, 0]}>
        <meshStandardMaterial color={frameColor} metalness={1} roughness={0.25} />
      </RoundedBox>
      <RoundedBox args={[0.012, 0.12, 0.03]} radius={0.005} position={[-W / 2 - 0.003, 0.3, 0]}>
        <meshStandardMaterial color={frameColor} metalness={1} roughness={0.25} />
      </RoundedBox>
      <RoundedBox args={[0.012, 0.12, 0.03]} radius={0.005} position={[-W / 2 - 0.003, 0.14, 0]}>
        <meshStandardMaterial color={frameColor} metalness={1} roughness={0.25} />
      </RoundedBox>
    </group>
  );
}

export default PhoneReal;
