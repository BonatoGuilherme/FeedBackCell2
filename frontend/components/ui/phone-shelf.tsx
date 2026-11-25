"use client";

/**
 * Prateleira de celulares — adaptada do "Product Shelf" de Aakash Mehra.
 * Cada fileira mostra os aparelhos (a foto do aparelho; sem foto, um celular
 * desenhado), a marca, o modelo e a nota média. Clicar abre a página do
 * aparelho (/catalogo/ID), com fotos, especificações e avaliações.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { NotaResumo, textoAvaliacoes } from "@/components/ui/rating";
import { CelularTransicao } from "@/components/ui/transicoes";
import { cn } from "@/lib/utils";
import { type Celular, type Especificacoes } from "@/src/lib/celulares";

const SPRING = { type: "spring" as const, bounce: 0, duration: 0.5 };

const FRAMES = ["#1f2027", "#d7d9df", "#26335c", "#4b3d7a", "#6b2433", "#244c42", "#b9a27c", "#3a3b44"];
const SCREENS = [
  "linear-gradient(160deg,#e6c27a,#7a4a1c 60%,#120c06)",
  "linear-gradient(160deg,#8fb0de,#2b3f68 60%,#0c0d14)",
  "linear-gradient(160deg,#e08a68,#7a2e1c 60%,#140906)",
  "linear-gradient(160deg,#efd9a8,#a0682c 55%,#1c1309)",
  "linear-gradient(160deg,#9cc9b2,#2f5a49 60%,#08100c)",
];

/** Especificações mostradas na página do aparelho, na ordem. */
export const ROTULOS_ESPECIFICACOES: [keyof Especificacoes, string][] = [
  ["lancamento", "Lançamento"],
  ["precoEstimado", "Preço de lançamento"],
  ["tela", "Tela"],
  ["hardware", "Hardware"],
  ["armazenamento", "Armazenamento"],
  ["camera", "Câmera"],
  ["bateria", "Bateria"],
  ["peso", "Peso"],
  ["espessura", "Espessura"],
];

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const frameOf = (c: Celular) => FRAMES[hash(c.marca.toLowerCase()) % FRAMES.length];
const screenOf = (c: Celular) => SCREENS[hash(c.modelo.toLowerCase()) % SCREENS.length];

// Aparelhos por prateleira: cada coluna ocupa pelo menos LARGURA_MINIMA (com
// GAP entre elas) e o aparelho em si tem no máximo 130 px, centralizado na
// coluna. Nunca menos de 2 colunas. Medidas: 8 colunas a 2000 px, 5 a 1366 px,
// 2 a 375 px.
const LARGURA_MINIMA = 200;
const GAP = 20;
const COLUNAS_MINIMAS = 2;
const COLUNAS_INICIAIS = 6;

function useColunas(ref: RefObject<HTMLElement | null>) {
  const [colunas, setColunas] = useState(COLUNAS_INICIAIS);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => {
      const largura = entrada.contentRect.width;
      setColunas(Math.max(COLUNAS_MINIMAS, Math.floor((largura + GAP) / (LARGURA_MINIMA + GAP))));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);

  return colunas;
}

type PhoneShelfProps = {
  celulares: Celular[];
  className?: string;
};

function rotuloAcessivel(c: Celular) {
  const nota =
    c.notaMedia === null || c.avaliacoes === 0
      ? "sem avaliações"
      : `nota ${c.notaMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5, ${textoAvaliacoes(c.avaliacoes)}`;
  return `${c.marca} ${c.modelo}, ${nota}`;
}

export function PhoneShelf({ celulares, className }: PhoneShelfProps) {
  const prateleiraRef = useRef<HTMLDivElement>(null);
  const colunas = useColunas(prateleiraRef);
  const grade = { gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` };
  const rows: Celular[][] = [];
  for (let i = 0; i < celulares.length; i += colunas) rows.push(celulares.slice(i, i + colunas));

  return (
    <>
      <div ref={prateleiraRef} className={cn("relative px-2 sm:px-6", className)}>
        {rows.map((row, r) => (
          <section key={r} aria-label={`Prateleira ${r + 1}`} className="relative mb-6 last:mb-0">
            <div className="relative z-10 grid items-end gap-5" style={grade}>
              {row.map((c) => (
                <div key={c.idcelular} className="relative flex justify-center">
                  {/* sombra de chão sob o aparelho (no lugar da prateleira branca) */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -bottom-3 left-1/2 h-5 w-[min(100%,150px)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(201,151,63,0.35),transparent)]"
                  />
                  <Link
                    href={`/catalogo/${c.idcelular}`}
                    aria-label={rotuloAcessivel(c)}
                    className="relative block aspect-[1/2] w-full max-w-[130px] cursor-pointer rounded-[22%/11%] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4"
                  >
                    <motion.span
                      className="absolute inset-0 block"
                      transition={SPRING}
                      whileHover={{ y: -10, rotateY: -18, rotateX: 8, scale: 1.06 }}
                      style={{ transformPerspective: 600 }}
                    >
                      <CelularTransicao id={c.idcelular}>
                        <PhoneVisual celular={c} />
                      </CelularTransicao>
                    </motion.span>
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-5" style={grade}>
              {row.map((c) => (
                <div key={c.idcelular} className="min-w-0 text-center">
                  <ShelfLabel celular={c} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/**
 * Aparelho pequeno com marca, modelo e nota, usado na faixa "Mais da marca" da
 * página do celular: mesma linguagem da prateleira, numa caixa menor.
 * Sem nome de transição: só a foto principal voa entre o catálogo e o celular
 * (com nome, cada mini-cartão voava até o cartão igual na prateleira).
 */
export function PhoneMiniCard({ celular }: { celular: Celular }) {
  return (
    <Link
      href={`/catalogo/${celular.idcelular}`}
      aria-label={rotuloAcessivel(celular)}
      className="group flex flex-col items-center gap-3 rounded-[18px] border border-line bg-surface-soft px-3 py-4 outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span className="relative block aspect-[1/2] w-full max-w-[64px]">
        <span className="absolute inset-0 block transition-transform duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          <PhoneVisual celular={celular} />
        </span>
      </span>
      <div className="min-w-0 self-stretch text-center">
        <ShelfLabel celular={celular} />
      </div>
    </Link>
  );
}

function ShelfLabel({ celular }: { celular: Celular }) {
  return (
    <>
      <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle" title={celular.marca}>{celular.marca}</div>
      <div className="mt-1 truncate text-[16px] font-medium leading-snug text-foreground" title={celular.modelo}>{celular.modelo}</div>
      <NotaResumo compacto notaMedia={celular.notaMedia} avaliacoes={celular.avaliacoes} className="mt-1 text-[14px]" />
    </>
  );
}

/**
 * A foto do aparelho (da API ou enviada) num cartão do mesmo tamanho do celular
 * desenhado, para todos ficarem iguais na prateleira; sem foto, o celular desenhado.
 * `ajuste`: "cover" preenche o cartão; "contain" mostra a foto inteira.
 */
function PhoneVisual({
  celular,
  src = celular.imagens[0]?.url,
  ajuste = "contain",
}: {
  celular: Celular;
  src?: string;
  ajuste?: "cover" | "contain";
}) {
  if (src) {
    return (
      <span className="absolute inset-0 overflow-hidden rounded-[14%/7%] bg-surface-solid shadow-[0_18px_30px_-16px_rgba(15,16,32,0.45)] ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API */}
        <img
          src={src}
          alt=""
          loading="lazy"
          className={cn("foto-aparelho size-full", ajuste === "cover" ? "object-cover" : "object-contain p-[8%]")}
        />
      </span>
    );
  }
  return <PhoneArt celular={celular} />;
}

/** Celular de frente, desenhado em HTML (para aparelhos sem foto). */
export function PhoneArt({ celular }: { celular: Celular }) {
  return (
    <span
      className="absolute inset-0 rounded-[22%/11%] p-[5%] shadow-[0_18px_30px_-14px_rgba(15,16,32,0.55),inset_0_0_0_1px_rgba(255,255,255,0.25)]"
      style={{ background: frameOf(celular) }}
    >
      <span className="relative block size-full overflow-hidden rounded-[18%/9%]" style={{ background: screenOf(celular) }}>
        <span className="absolute inset-x-0 top-[22%] text-center text-[13px] font-semibold text-white/90">9:41</span>
        <span className="absolute left-1/2 top-[3%] h-[4%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22),rgba(255,255,255,0)_40%)]" />
      </span>
      {/* botões laterais */}
      <span className="absolute -right-[2.5%] top-[24%] h-[12%] w-[2.5%] rounded-r" style={{ background: frameOf(celular) }} />
      <span className="absolute -left-[2.5%] top-[20%] h-[7%] w-[2.5%] rounded-l" style={{ background: frameOf(celular) }} />
      <span className="absolute -left-[2.5%] top-[30%] h-[7%] w-[2.5%] rounded-l" style={{ background: frameOf(celular) }} />
    </span>
  );
}
