/**
 * Peças comuns dos andares: a seção do andar (fachada do prédio) e o telão
 * com o h2, a placa em japonês (decorativa) e o número do andar.
 */

import type { ReactNode } from "react";
import { andar, idTitulo } from "@/src/lib/predio/andares";
import { cn } from "@/lib/utils";

export function Andar({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} tabIndex={-1} aria-labelledby={idTitulo(id)} className={cn("andar", `andar--${id}`, className)}>
      <div className="andar__fachada">{children}</div>
    </section>
  );
}

/** Placa em japonês: só decoração, fica fora da leitura de tela. */
export function PlacaJp({ texto, significado, className }: { texto: string; significado: string; className?: string }) {
  return (
    <span className={cn("placa-jp", className)} aria-hidden="true" title={significado}>
      {texto}
    </span>
  );
}

export function Telao({
  id,
  titulo,
  placa,
  className,
  children,
}: {
  /** id do andar (src/lib/predio/andares.ts). */
  id: string;
  titulo: ReactNode;
  placa?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { numero } = andar(id);
  return (
    <div className={cn("telao", className)}>
      <div className="telao__cabeca">
        <span className="telao__andar" aria-hidden="true">
          {numero}
        </span>
        <h2 id={idTitulo(id)} className="telao__titulo">
          {titulo}
        </h2>
        {placa}
      </div>
      <div className="telao__tela">{children}</div>
    </div>
  );
}
