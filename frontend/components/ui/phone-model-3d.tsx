"use client";

/**
 * Modelo 3D real de um celular (.glb local) desenhado com React Three Fiber:
 * fundo transparente, gira sozinho, dá para arrastar e flutua de leve.
 * O modelo é centralizado e redimensionado automaticamente, qualquer que seja
 * a escala original do arquivo. Entra com um giro quando termina de carregar.
 */

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type PhoneModel3DProps = {
  url: string;
  className?: string;
  label: string;
  reduzirMovimento?: boolean;
  onPronto?: () => void;
};

const ALTURA = 1.75; // altura do aparelho em unidades da cena

export function PhoneModel3D({ url, className, label, reduzirMovimento, onPronto }: PhoneModel3DProps) {
  return (
    <div role="img" aria-label={label} className={className}>
      <Canvas
        dpr={[1, 2]}
        // mede pelo tamanho de layout: o palco entra animado (scale/rotateY) e,
        // com o modelo em cache, o Canvas monta no meio da animação; medir com
        // getBoundingClientRect gravava a largura distorcida e o aparelho ficava torto
        resize={{ offsetSize: true }}
        camera={{ position: [0, 0, 5.2], fov: 32 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        className="!cursor-grab active:!cursor-grabbing"
      >
        <Suspense fallback={null}>
          <Float
            speed={reduzirMovimento ? 0 : 1.4}
            rotationIntensity={0.25}
            floatIntensity={0.6}
          >
            <Modelo url={url} girando={!reduzirMovimento} onPronto={onPronto} />
          </Float>
          <Estudio />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          minPolarAngle={Math.PI / 2 - 0.5}
          maxPolarAngle={Math.PI / 2 + 0.4}
        />
      </Canvas>
    </div>
  );
}

function Modelo({ url, girando, onPronto }: { url: string; girando: boolean; onPronto?: () => void }) {
  const { scene } = useGLTF(url);
  const grupo = useRef<THREE.Group>(null);
  const entrada = useRef(0);

  // centraliza e ajusta a escala pela caixa do modelo
  const { objeto, escala } = useMemo(() => {
    const copia = scene.clone(true);
    // materiais translúcidos (BLEND) não gravam profundidade por padrão: a parte
    // de trás do aparelho (câmeras) aparecia por cima da tela
    copia.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m.transparent) m.depthWrite = true;
      }
    });
    const caixa = new THREE.Box3().setFromObject(copia);
    const tamanho = caixa.getSize(new THREE.Vector3());
    const centro = caixa.getCenter(new THREE.Vector3());
    copia.position.sub(centro);
    return { objeto: copia, escala: ALTURA / Math.max(tamanho.y, tamanho.x * 0.6, 1e-6) };
  }, [scene]);

  useLayoutEffect(() => {
    onPronto?.();
  }, [onPronto, objeto]);

  useFrame((_, delta) => {
    const g = grupo.current;
    if (!g) return;
    // entrada: cresce e gira de lado para a frente
    if (entrada.current < 1) {
      entrada.current = Math.min(1, entrada.current + delta / 1.1);
      const t = 1 - Math.pow(1 - entrada.current, 3);
      g.scale.setScalar(escala * (0.6 + 0.4 * t));
      g.rotation.y = (1 - t) * -Math.PI * 0.9;
      return;
    }
    if (girando) g.rotation.y += delta * 0.45;
  });

  return (
    <group ref={grupo} scale={escala * 0.6}>
      <primitive object={objeto} />
    </group>
  );
}

/** Luz de estúdio quente, gerada localmente (sem baixar mapa HDR). */
function Estudio() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color="#ffe6b8" />
      <directionalLight position={[-4, 1, -3]} intensity={0.9} color="#9fb6e0" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} color="#fff1d6" position={[0, 3, 4]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#e6b86a" position={[-4, 0, 2]} rotation-y={Math.PI / 3} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#8fb0de" position={[4, 0, 2]} rotation-y={-Math.PI / 3} scale={[2, 6, 1]} />
        <Lightformer form="ring" intensity={1.4} color="#e6b86a" position={[0, -2, -3]} scale={2.5} />
      </Environment>
    </>
  );
}


export default PhoneModel3D;
