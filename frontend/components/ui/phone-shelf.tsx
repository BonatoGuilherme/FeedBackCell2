"use client";

/**
 * Prateleira de celulares — adaptada do "Product Shelf" de Aakash Mehra.
 * Cada fileira mostra os aparelhos (a foto do aparelho; sem foto, um celular
 * desenhado). Ao clicar, o aparelho "voa" para um modal com fotos, especificações e,
 * quando houver, o modelo 3D. Clicar fora, Esc ou o botão X fecha e o
 * aparelho volta para o mesmo lugar na prateleira. O celular aberto é controlado
 * pelo pai (o catálogo abre direto o celular de /catalog?celular=ID).
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhonePhoto } from "@/components/ui/phone-photo";
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

const ROTULOS: [keyof Especificacoes, string][] = [
  ["lancamento", "Lançamento"],
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

// aparelhos por prateleira: 3 no celular, 4 no tablet, 6 no desktop
const CONSULTA_DESKTOP = "(min-width: 1024px)";
const CONSULTA_TABLET = "(min-width: 640px)";

function assinarLargura(avisar: () => void) {
  const consultas = [CONSULTA_DESKTOP, CONSULTA_TABLET].map((q) => window.matchMedia(q));
  consultas.forEach((m) => m.addEventListener("change", avisar));
  return () => consultas.forEach((m) => m.removeEventListener("change", avisar));
}

function useColunas() {
  return useSyncExternalStore(
    assinarLargura,
    () => (window.matchMedia(CONSULTA_DESKTOP).matches ? 6 : window.matchMedia(CONSULTA_TABLET).matches ? 4 : 3),
    () => 6,
  );
}

type PhoneShelfProps = {
  celulares: Celular[];
  formatPrice: (preco: number) => string;
  /** Celular aberto no modal (pode não estar nesta página da prateleira). */
  aberto: Celular | null;
  onAbrir: (celular: Celular) => void;
  /** Precisa ser estável (useCallback). */
  onFechar: () => void;
  className?: string;
};

export function PhoneShelf({ celulares, formatPrice, aberto, onAbrir, onFechar, className }: PhoneShelfProps) {
  const openId = aberto?.idcelular ?? null;
  const colunas = useColunas();
  const grade = { gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` };
  const rows: Celular[][] = [];
  for (let i = 0; i < celulares.length; i += colunas) rows.push(celulares.slice(i, i + colunas));

  return (
    <LayoutGroup>
      <div className={cn("relative", className)}>
        {rows.map((row, r) => (
          <section key={r} aria-label={`Prateleira ${r + 1}`} className="relative mb-6 last:mb-0">
            <div className="relative z-10 grid items-end gap-4 px-2 sm:gap-6 sm:px-6" style={grade}>
              {row.map((c) => (
                <div key={c.idcelular} className="relative flex justify-center">
                  {/* sombra de chão sob o aparelho (no lugar da prateleira branca) */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -bottom-2.5 left-1/2 h-4 w-[min(100%,96px)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(201,151,63,0.35),transparent)]"
                  />
                  {openId === c.idcelular ? (
                    <div className="aspect-[1/2] w-full max-w-[76px]" />
                  ) : (
                    <motion.button
                      layoutId={`phone-${c.idcelular}`}
                      type="button"
                      onClick={() => onAbrir(c)}
                      aria-label={`${c.marca} ${c.modelo}, ${formatPrice(c.preco)}`}
                      transition={SPRING}
                      whileHover={{ y: -10, rotateY: -18, rotateX: 8, scale: 1.06 }}
                      style={{ transformPerspective: 600 }}
                      className="relative aspect-[1/2] w-full max-w-[76px] cursor-pointer rounded-[22%/11%] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4"
                    >
                      <PhoneVisual celular={c} />
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 px-2 sm:gap-6 sm:px-6" style={grade}>
              {row.map((c) => (
                <div key={c.idcelular} className="min-w-0 text-center">
                  <ShelfLabel celular={c} formatPrice={formatPrice} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <AnimatePresence>
        {aberto && (
          <ProductModal
            key={aberto.idcelular}
            celular={aberto}
            formatPrice={formatPrice}
            onClose={onFechar}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

function ShelfLabel({ celular, formatPrice }: { celular: Celular; formatPrice: (n: number) => string }) {
  return (
    <>
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle" title={celular.marca}>{celular.marca}</div>
      <div className="mt-0.5 truncate text-[14px] font-medium leading-tight text-foreground" title={celular.modelo}>{celular.modelo}</div>
      <div className="mt-0.5 text-[13px] tabular-nums text-muted">
        {celular.preco > 0 ? formatPrice(celular.preco) : "Preço não informado"}
      </div>
    </>
  );
}

/**
 * A foto do aparelho (da API ou enviada) num cartão do mesmo tamanho do celular
 * desenhado, para todos ficarem iguais na prateleira; sem foto, o celular desenhado.
 * `ajuste`: "cover" preenche o cartão (prateleira); "contain" mostra a foto inteira (modal).
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
function PhoneArt({ celular }: { celular: Celular }) {
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

function ProductModal({
  celular,
  formatPrice,
  onClose,
}: {
  celular: Celular;
  formatPrice: (n: number) => string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { especificacoes } = celular;
  const specs = especificacoes ? ROTULOS.filter(([campo]) => especificacoes[campo]) : [];
  const fade = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { ...SPRING, delay: reduce ? 0 : 0.08 },
  };

  // Esc fecha, foco no botão de fechar e a página por trás não rola.
  // O <html> reserva o espaço da barra (scrollbar-gutter: stable, em globals.css); com
  // overflow só no body essa faixa vazia continuava visível à direita, fora do fundo
  // fixo do modal. Aqui a rolagem trava no <html>, a reserva é desligada e a largura
  // da barra vira padding-right no body, para o conteúdo não "pular".
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const body = document.body;
    const barra = window.innerWidth - html.clientWidth;
    const antes = {
      overflow: html.style.overflow,
      gutter: html.style.scrollbarGutter,
      padding: body.style.paddingRight,
    };
    const paddingAtual = parseFloat(getComputedStyle(body).paddingRight) || 0;
    html.style.overflow = "hidden";
    html.style.scrollbarGutter = "auto";
    if (barra > 0) body.style.paddingRight = `${paddingAtual + barra}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = antes.overflow;
      html.style.scrollbarGutter = antes.gutter;
      body.style.paddingRight = antes.padding;
    };
  }, [onClose]);

  // portal no <body>: fora da árvore da página o desfoque do fundo pega a tela toda
  // (um ancestral com efeito visual limitaria o backdrop-filter à área dele)
  return createPortal(
    // o desfoque fica no próprio contêiner fixo: num filho dele o Chrome não desfoca a página
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      initial={{ backdropFilter: "blur(0px) saturate(1)" }}
      animate={{ backdropFilter: "blur(12px) saturate(1.2)" }}
      exit={{ backdropFilter: "blur(0px) saturate(1)" }}
      transition={{ duration: 0.25 }}
    >
      {/* fundo: clicar fora fecha */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[#0b0b10]/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${celular.marca} ${celular.modelo}`}
        className="relative grid max-h-[calc(100dvh-1.5rem)] w-full max-w-[960px] grid-cols-1 overflow-y-auto rounded-[24px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:overflow-hidden"
      >
        {/* o painel aparece em fade; o aparelho "voa" por cima dele */}
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-[24px] bg-surface-solid shadow-[0_40px_90px_-30px_rgba(15,16,32,0.55)]"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22 }}
        />

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-20 grid size-9 cursor-pointer place-items-center rounded-full bg-surface-solid/90 text-foreground ring-1 ring-line-strong transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" strokeWidth={2.2} aria-hidden />
        </button>

        {/* mídia */}
        <PhonePhoto celular={celular} placeholder={<PhoneArt celular={celular} />} />

        {/* informações */}
        <motion.div
          {...fade}
          className="relative px-6 pb-7 pt-6 sm:px-8 md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto md:pt-10"
        >
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-on-dark">{celular.marca}</div>
          <h2 className="mt-1 pr-8 text-[clamp(26px,3.4vw,36px)] font-semibold leading-[1.08] tracking-[-0.022em] text-foreground">
            {celular.modelo}
          </h2>
          <div className="mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-foreground">
            {celular.preco > 0 ? formatPrice(celular.preco) : "Preço não informado"}
          </div>
          {celular.descricao && (
            <p className="mt-3 text-[15px] leading-[1.55] text-foreground/75">{celular.descricao}</p>
          )}

          {specs.length > 0 && (
            <dl className="mt-5 grid gap-x-4 gap-y-1 rounded-2xl bg-surface-soft p-4 text-[13px] sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-y-2.5">
              {specs.map(([campo, rotulo]) => (
                <div key={campo} className="contents">
                  <dt className="text-subtle">{rotulo}</dt>
                  <dd className="mb-2 break-words text-foreground sm:mb-0">{especificacoes?.[campo]}</dd>
                </div>
              ))}
            </dl>
          )}

          {celular.dataCriacao && (
            <dl className="mt-4 flex items-baseline gap-1.5 text-[13px]">
              <dt className="text-subtle">Cadastrado em</dt>
              <dd className="font-medium tabular-nums text-muted">
                {new Date(celular.dataCriacao).toLocaleDateString("pt-BR")}
              </dd>
            </dl>
          )}

          <Button asChild size="lg" className="mt-5 w-full sm:w-auto">
            <Link href={`/comments?celular=${celular.idcelular}`}>
              <MessageSquareText className="size-4" aria-hidden />
              Ver comentários
            </Link>
          </Button>
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  );
}
