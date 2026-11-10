"use client";

/**
 * Coluna de mídia do modal de detalhes do celular: a foto (inteira, num quadro
 * neutro que acompanha a proporção da imagem), o modelo 3D, as miniaturas e o
 * crédito da foto com os links exigidos pela licença.
 */

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Box, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { sketchfabEmbedUrl, type Celular } from "@/src/lib/celulares";

const SPRING = { type: "spring" as const, bounce: 0, duration: 0.5 };

/** Altura máxima da foto e do 3D no modal. */
const ALTURA_MIDIA = "max-h-[min(60vh,520px)]";

const VERSOES_CC = new Set(["1.0", "2.0", "2.5", "3.0", "4.0"]);
const MODIFICADORES_CC = new Set(["by", "by-sa", "by-nd", "by-nc", "by-nc-sa", "by-nc-nd"]);

export type LicencaCreativeCommons = {
  /** Trecho do texto que cita a licença (ex.: "CC BY-SA 4.0"). */
  rotulo: string;
  url: string;
  inicio: number;
  fim: number;
};

/**
 * Procura uma licença Creative Commons conhecida no texto do crédito
 * (ex.: "Foto: Fulano · CC BY-SA 4.0 · Wikimedia Commons") e devolve o link
 * oficial dela. Licenças adaptadas (ex.: "CC BY-SA 3.0 de") apontam para a
 * versão da jurisdição. Sem licença reconhecida, devolve null.
 */
export function licencaCreativeCommons(texto: string): LicencaCreativeCommons | null {
  const cc0 = /\bCC0(?:[\s-]*1\.0)?\b/i.exec(texto);
  if (cc0) {
    return {
      rotulo: cc0[0],
      url: "https://creativecommons.org/publicdomain/zero/1.0/",
      inicio: cc0.index,
      fim: cc0.index + cc0[0].length,
    };
  }

  const m = /\bCC[\s-]+BY((?:[\s-]+(?:NC|SA|ND))*)[\s-]+(\d\.\d)(?:[\s-]+([a-z]{2}))?\b/i.exec(texto);
  if (!m) return null;
  const extras = m[1].toLowerCase().split(/[\s-]+/).filter(Boolean);
  // ordem canônica das URLs: by[-nc][-sa|-nd]
  const tipo = ["by", ...["nc", "sa", "nd"].filter((x) => extras.includes(x))].join("-");
  const versao = m[2];
  if (!MODIFICADORES_CC.has(tipo) || !VERSOES_CC.has(versao)) return null;
  // a 4.0 não tem versões por jurisdição
  const jurisdicao = m[3] && versao !== "4.0" ? `${m[3].toLowerCase()}/` : "";
  return {
    rotulo: m[0],
    url: `https://creativecommons.org/licenses/${tipo}/${versao}/${jurisdicao}`,
    inicio: m.index,
    fim: m.index + m[0].length,
  };
}

const LINK_CREDITO =
  "rounded-sm text-muted underline decoration-muted/40 underline-offset-2 transition hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-accent";

function LinkExterno({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CREDITO}>
      {children}
    </a>
  );
}

/** Crédito da foto: o texto leva à página da imagem e a licença, ao texto da licença. */
function CreditoFoto({ texto, url }: { texto: string; url: string | null }) {
  const licenca = licencaCreativeCommons(texto);
  const trecho = (t: string) => (t && url ? <LinkExterno href={url}>{t}</LinkExterno> : t);
  if (!licenca) return <>{trecho(texto)}</>;
  return (
    <>
      {trecho(texto.slice(0, licenca.inicio))}
      <LinkExterno href={licenca.url}>{licenca.rotulo}</LinkExterno>
      {trecho(texto.slice(licenca.fim))}
    </>
  );
}

export function PhonePhoto({
  celular,
  placeholder,
}: {
  celular: Celular;
  /** Celular desenhado, mostrado na moldura de celular quando não há foto. */
  placeholder: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [foto, setFoto] = useState(0);
  const [modo, setModo] = useState<"fotos" | "3d">("fotos");
  const { imagens, especificacoes, modelo3d } = celular;
  const atual = imagens[foto];
  const fade = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { ...SPRING, delay: reduce ? 0 : 0.08 },
  };

  return (
    <div className="relative flex flex-col items-center gap-4 rounded-t-[24px] bg-[radial-gradient(90%_70%_at_50%_20%,rgba(201,151,63,0.16),transparent_70%)] px-4 pb-5 pt-12 sm:px-6 md:max-h-[calc(100dvh-3rem)] md:justify-center md:overflow-y-auto md:rounded-l-[24px] md:rounded-tr-none md:py-10">
      {/*
        O modelo 3D começa a carregar assim que o modal abre, escondido fora da
        tela; ao clicar em "Ver em 3D" o mesmo iframe só aparece (sem recarregar).
      */}
      {modelo3d && (
        <div
          aria-hidden={modo !== "3d"}
          className={cn(
            "aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-2xl bg-surface-soft transition-opacity duration-300",
            ALTURA_MIDIA,
            modo === "3d"
              ? "relative opacity-100"
              : "pointer-events-none fixed left-[-200vw] top-0 h-[520px] w-[460px] opacity-0",
          )}
        >
          <iframe
            title={`${celular.marca} ${celular.modelo} em 3D`}
            src={sketchfabEmbedUrl(modelo3d)}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={modo === "3d" ? 0 : -1}
            className="size-full border-0"
          />
        </div>
      )}
      {modo === "3d" && modelo3d ? null : atual ? (
        // foto real: inteira (object-contain), num quadro retangular neutro que segue a
        // proporção da imagem — larga ocupa a largura; alta para na altura máxima
        <motion.div
          layoutId={`phone-${celular.idcelular}`}
          transition={SPRING}
          className="relative flex min-h-40 w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-solid shadow-[0_18px_40px_-22px_rgba(15,16,32,0.4)] ring-1 ring-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API */}
          <img
            key={atual.idimagem}
            src={atual.url}
            alt={`${celular.marca} ${celular.modelo}, foto ${foto + 1} de ${imagens.length}`}
            className={cn("foto-aparelho block h-auto w-full object-contain", ALTURA_MIDIA)}
          />
        </motion.div>
      ) : (
        // sem foto: o celular desenhado, na moldura de celular
        <motion.div
          layoutId={`phone-${celular.idcelular}`}
          transition={SPRING}
          className="relative aspect-[1/2] h-[min(56vh,480px)] rounded-[22%/11%]"
        >
          {placeholder}
        </motion.div>
      )}

      <motion.div {...fade} className="flex w-full flex-col items-center gap-3">
        {modelo3d && (
          <div className="inline-flex rounded-full bg-surface-solid p-1 ring-1 ring-line" role="group" aria-label="Visualização">
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
                    "size-14 cursor-pointer overflow-hidden rounded-xl bg-surface-solid ring-2 ring-offset-2 ring-offset-surface-solid transition",
                    i === foto ? "ring-accent" : "ring-transparent opacity-70 hover:opacity-100",
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
          <p className="text-sm text-subtle">Este aparelho ainda não tem fotos.</p>
        )}
        {/* a primeira foto é a da busca; a licença do Wikimedia exige o crédito e o link da licença */}
        {modo === "fotos" && foto === 0 && especificacoes?.creditoImagem && (
          <p className="max-w-[420px] text-center text-[11px] leading-snug text-subtle">
            <CreditoFoto texto={especificacoes.creditoImagem} url={especificacoes.creditoImagemUrl} />
          </p>
        )}
      </motion.div>
    </div>
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
        ativo ? "bg-accent text-on-accent" : "text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
