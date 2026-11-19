"use client";
/// <reference types="react/canary" />

/**
 * Transições entre páginas de celular (View Transitions via React ViewTransition).
 *
 * - CelularTransicao: marca a foto do aparelho com o nome `celular-ID`. Quando a
 *   prateleira do catálogo e a página do celular usam o mesmo nome, a foto "voa"
 *   de um lugar para o outro (classe `celula-voo`, em transitions.css).
 * - TransicaoPagina: envolve a página de um celular. Trocar de celular com as
 *   setas (tipo "anterior" ou "proximo") desliza o conteúdo para o lado certo.
 *
 * Sem suporte do navegador (ou com prefers-reduced-motion) a troca continua
 * funcionando; só deixa de haver movimento (o CSS cuida do crossfade).
 */

import type { ReactNode } from "react";
import { ViewTransition } from "react";

/** Tipos de navegação lateral; cada um tem sua própria direção de entrada e saída. */
export type TipoNavegacaoCelular = "anterior" | "proximo";

const ENTRADA: Record<string, string> = {
  anterior: "celula-entra-esq",
  proximo: "celula-entra-dir",
};

const SAIDA: Record<string, string> = {
  anterior: "celula-sai-dir",
  proximo: "celula-sai-esq",
};

export function CelularTransicao({ id, children }: { id: number; children: ReactNode }) {
  return (
    <ViewTransition name={`celular-${id}`} share="celula-voo" default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Envolve a página de um celular. A chave muda a cada aparelho; com um tipo de
 * navegação ativo a página sai e entra deslizando, sem tipo (clique no catálogo)
 * não há animação própria, só a da foto compartilhada.
 */
export function TransicaoPagina({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter={{ ...ENTRADA, default: "none" }}
      exit={{ ...SAIDA, default: "none" }}
    >
      {children}
    </ViewTransition>
  );
}
