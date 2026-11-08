"use client";

/**
 * Prateleira de celulares — adaptada do "Product Shelf" de Aakash Mehra.
 * Cada fileira mostra os aparelhos (a foto do aparelho; sem foto, um celular
 * desenhado). Ao clicar, o aparelho "voa" para um modal com fotos, especificações e,
 * quando houver, o modelo 3D. Clicar fora, Esc, X ou "Voltar ao catálogo" fecha e o
 * aparelho volta para o mesmo lugar na prateleira. O celular aberto é controlado
 * pelo pai (o catálogo abre direto o celular de /catalog?celular=ID).
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Box, ChevronLeft, Images, MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sketchfabEmbedUrl, type Celular, type Especificacoes } from "@/src/lib/celulares";

const SPRING = { type: "spring" as const, bounce: 0, duration: 0.5 };

const FRAMES = ["#1f2027", "#d7d9df", "#26335c", "#4b3d7a", "#6b2433", "#244c42", "#b9a27c", "#3a3b44"];
const SCREENS = [
  "linear-gradient(160deg,#6d7bff,#2a1f6b 60%,#0b0b10)",
  "linear-gradient(160deg,#22d3ee,#1e3a8a 60%,#0b0b10)",
  "linear-gradient(160deg,#f472b6,#6d28d9 60%,#0b0b10)",
  "linear-gradient(160deg,#fbbf24,#b45309 55%,#1c1917)",
  "linear-gradient(160deg,#34d399,#065f46 60%,#0b0b10)",
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
                    className="pointer-events-none absolute -bottom-2.5 left-1/2 h-4 w-[min(100%,96px)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(15,16,32,0.22),transparent)]"
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
                      whileHover={{ y: -5 }}
                      className="relative aspect-[1/2] w-full max-w-[76px] cursor-pointer rounded-[22%/11%] outline-none focus-visible:ring-2 focus-visible:ring-[#4c5cf5] focus-visible:ring-offset-4"
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
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8ea3]" title={celular.marca}>{celular.marca}</div>
      <div className="mt-0.5 truncate text-[14px] font-medium leading-tight text-[#0f1020]" title={celular.modelo}>{celular.modelo}</div>
      <div className="mt-0.5 text-[13px] tabular-nums text-[#5f6378]">
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
  ajuste = "cover",
}: {
  celular: Celular;
  src?: string;
  ajuste?: "cover" | "contain";
}) {
  if (src) {
    return (
      <span className="absolute inset-0 overflow-hidden rounded-[14%/7%] bg-white shadow-[0_18px_30px_-16px_rgba(15,16,32,0.45)] ring-1 ring-black/[0.06]">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API */}
        <img
          src={src}
          alt=""
          loading="lazy"
          className={cn("foto-aparelho size-full", ajuste === "cover" ? "object-cover" : "object-contain")}
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
  const [foto, setFoto] = useState(0);
  const [modo, setModo] = useState<"fotos" | "3d">("fotos");
  const closeRef = useRef<HTMLButtonElement>(null);
  const { imagens, especificacoes, modelo3d } = celular;
  const atual = imagens[foto];
  const specs = especificacoes ? ROTULOS.filter(([campo]) => especificacoes[campo]) : [];
  const fade = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { ...SPRING, delay: reduce ? 0 : 0.08 },
  };

  // Esc fecha, foco no botão de fechar e a página por trás não rola
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
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
          className="absolute inset-0 rounded-[24px] bg-white shadow-[0_40px_90px_-30px_rgba(15,16,32,0.55)]"
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
          className="absolute right-3 top-3 z-20 grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 text-[#0f1020] ring-1 ring-black/10 transition hover:bg-[#f1f2f7] focus-visible:outline-2 focus-visible:outline-[#4c5cf5]"
        >
          <X className="size-4" strokeWidth={2.2} aria-hidden />
        </button>

        {/* mídia */}
        <div className="relative flex flex-col items-center gap-4 rounded-t-[24px] bg-[radial-gradient(90%_70%_at_50%_20%,#eef0ff,#f4f5f9_70%)] px-5 pb-5 pt-10 md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto md:rounded-l-[24px] md:rounded-tr-none">
          {modo === "3d" && modelo3d ? (
            <motion.div {...fade} className="aspect-[4/5] w-full max-w-[380px] overflow-hidden rounded-2xl bg-[#e9ebf3]">
              <iframe
                title={`${celular.marca} ${celular.modelo} em 3D`}
                src={sketchfabEmbedUrl(modelo3d)}
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="size-full border-0"
              />
            </motion.div>
          ) : (
            <motion.div
              layoutId={`phone-${celular.idcelular}`}
              transition={SPRING}
              className="relative aspect-[1/2] h-[min(46vh,400px)] rounded-[22%/11%]"
            >
              <PhoneVisual celular={celular} src={atual?.url} ajuste="contain" />
            </motion.div>
          )}

          <motion.div {...fade} className="flex w-full flex-col items-center gap-3">
            {modelo3d && (
              <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-black/[0.06]" role="group" aria-label="Visualização">
                <ModoButton ativo={modo === "fotos"} onClick={() => setModo("fotos")}>
                  <Images className="size-4" aria-hidden /> Fotos
                </ModoButton>
                <ModoButton ativo={modo === "3d"} onClick={() => setModo("3d")}>
                  <Box className="size-4" aria-hidden /> Ver em 3D
                </ModoButton>
              </div>
            )}
            {modo === "fotos" && imagens.length > 1 && (
              <ul className="flex flex-wrap justify-center gap-2" aria-label="Fotos do aparelho">
                {imagens.map((img, i) => (
                  <li key={img.idimagem}>
                    <button
                      type="button"
                      onClick={() => setFoto(i)}
                      aria-label={`Mostrar foto ${i + 1}`}
                      aria-pressed={i === foto}
                      className={cn(
                        "size-12 cursor-pointer overflow-hidden rounded-xl bg-white ring-2 ring-offset-2 ring-offset-[#f4f5f9] transition",
                        i === foto ? "ring-[#4c5cf5]" : "ring-transparent opacity-70 hover:opacity-100",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API */}
                      <img src={img.url} alt="" loading="lazy" className="size-full object-contain mix-blend-multiply" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {modo === "fotos" && imagens.length === 0 && (
              <p className="text-sm text-[#8a8ea3]">Este aparelho ainda não tem fotos.</p>
            )}
            {/* a primeira foto é a da busca; a licença do Wikimedia exige o crédito */}
            {modo === "fotos" && foto === 0 && especificacoes?.creditoImagem && (
              <p className="max-w-[320px] text-center text-[11px] leading-snug text-[#8a8ea3]">
                {especificacoes.creditoImagemUrl ? (
                  <a href={especificacoes.creditoImagemUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                    {especificacoes.creditoImagem}
                  </a>
                ) : (
                  especificacoes.creditoImagem
                )}
              </p>
            )}
          </motion.div>
        </div>

        {/* informações */}
        <motion.div
          {...fade}
          className="relative px-6 pb-7 pt-6 sm:px-8 md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto md:pt-10"
        >
          <button
            type="button"
            onClick={onClose}
            className="-ml-1.5 mb-5 inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-[14px] text-[#5f6378] underline-offset-4 hover:text-[#0f1020] hover:underline focus-visible:outline-2 focus-visible:outline-[#4c5cf5]"
          >
            <ChevronLeft className="size-4" strokeWidth={2.2} aria-hidden /> Voltar ao catálogo
          </button>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#4c5cf5]">{celular.marca}</div>
          <h2 className="mt-1 pr-8 text-[clamp(26px,3.4vw,36px)] font-semibold leading-[1.08] tracking-[-0.022em] text-[#0f1020]">
            {celular.modelo}
          </h2>
          <div className="mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-[#0f1020]">
            {celular.preco > 0 ? formatPrice(celular.preco) : "Preço não informado"}
          </div>
          {celular.descricao && (
            <p className="mt-3 text-[15px] leading-[1.55] text-[#0f1020]/75">{celular.descricao}</p>
          )}

          {specs.length > 0 && (
            <dl className="mt-5 grid gap-x-4 gap-y-1 rounded-2xl bg-[#f6f7fb] p-4 text-[13px] sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-y-2.5">
              {specs.map(([campo, rotulo]) => (
                <div key={campo} className="contents">
                  <dt className="text-[#8a8ea3]">{rotulo}</dt>
                  <dd className="mb-2 text-[#0f1020] sm:mb-0">{especificacoes?.[campo]}</dd>
                </div>
              ))}
            </dl>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-xl bg-white p-3.5 ring-1 ring-black/[0.06]">
              <dt className="text-[#8a8ea3]">Fotos</dt>
              <dd className="mt-0.5 font-semibold text-[#0f1020]">{imagens.length}</dd>
            </div>
            <div className="rounded-xl bg-white p-3.5 ring-1 ring-black/[0.06]">
              <dt className="text-[#8a8ea3]">Cadastrado em</dt>
              <dd className="mt-0.5 font-semibold text-[#0f1020]">
                {celular.dataCriacao ? new Date(celular.dataCriacao).toLocaleDateString("pt-BR") : "—"}
              </dd>
            </div>
          </dl>

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

function ModoButton({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
        ativo ? "bg-[#0b0b10] text-white" : "text-[#5f6378] hover:text-[#0f1020]",
      )}
    >
      {children}
    </button>
  );
}
