"use client";

/**
 * Notas de 1 a 5 estrelas: o resumo de um aparelho (média e número de avaliações)
 * e o campo para escolher a nota ao comentar.
 */

import { useId } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTA_MAX } from "@/src/lib/comentarios";

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ESTRELAS = Array.from({ length: NOTA_MAX }, (_, i) => i + 1);

export function textoAvaliacoes(quantidade: number) {
  return `${quantidade.toLocaleString("pt-BR")} ${quantidade === 1 ? "avaliação" : "avaliações"}`;
}

/** Estrelas preenchidas até `valor` (aceita meia estrela na média). */
export function Estrelas({ valor, className }: { valor: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden="true">
      {ESTRELAS.map((n) => {
        const preenchida = Math.min(1, Math.max(0, valor - (n - 1)));
        return (
          <span key={n} className="relative inline-block size-[1em]">
            <Star className="absolute inset-0 size-full text-line-strong" strokeWidth={1.8} />
            {preenchida > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${preenchida * 100}%` }}>
                <Star className="size-[1em] fill-accent text-accent" strokeWidth={1.8} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** "★ 4,3 · 12 avaliações", ou "Sem avaliações". */
export function NotaResumo({
  notaMedia,
  avaliacoes,
  className,
  compacto = false,
}: {
  notaMedia: number | null;
  avaliacoes: number;
  className?: string;
  /** Só a estrela, a média e o total (cartões e prateleira). */
  compacto?: boolean;
}) {
  if (notaMedia === null || avaliacoes === 0) {
    return <span className={cn("text-muted", className)}>Sem avaliações</span>;
  }
  const media = decimal.format(notaMedia);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}
      aria-label={`Nota ${media} de ${NOTA_MAX}, ${textoAvaliacoes(avaliacoes)}`}
    >
      {compacto ? (
        <Star className="size-[1em] fill-accent text-accent" strokeWidth={1.8} aria-hidden="true" />
      ) : (
        <Estrelas valor={notaMedia} />
      )}
      <span aria-hidden="true" className="font-semibold text-foreground">{media}</span>
      <span aria-hidden="true" className="text-muted">
        · {compacto ? avaliacoes.toLocaleString("pt-BR") : textoAvaliacoes(avaliacoes)}
      </span>
    </span>
  );
}

const ROTULOS_NOTA = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

/** Escolha da nota: um grupo de rádios estilizado como estrelas (teclado funciona com as setas). */
export function NotaCampo({
  valor,
  onChange,
  erro,
  disabled,
}: {
  valor: number;
  onChange: (nota: number) => void;
  erro?: string;
  disabled?: boolean;
}) {
  const nome = useId();
  const erroId = `${nome}-erro`;
  return (
    <fieldset
      className="rating-field"
      aria-describedby={erro ? erroId : undefined}
      aria-invalid={erro ? true : undefined}
      disabled={disabled}
    >
      <legend>Sua nota</legend>
      <div className="rating-field__stars">
        {ESTRELAS.map((n) => (
          <label key={n} className={cn("rating-field__star", n <= valor && "is-on")}>
            <input
              type="radio"
              name={nome}
              value={n}
              checked={valor === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <Star aria-hidden="true" strokeWidth={1.8} />
            <span className="sr-only">
              {n} {n === 1 ? "estrela" : "estrelas"}, {ROTULOS_NOTA[n]}
            </span>
          </label>
        ))}
        <span className="rating-field__hint" aria-hidden="true">
          {valor ? ROTULOS_NOTA[valor] : "Escolha de 1 a 5"}
        </span>
      </div>
      {erro && (
        <p id={erroId} className="rating-field__error" role="alert">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
