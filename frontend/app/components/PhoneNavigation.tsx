"use client";

/**
 * Navegação entre celulares na página do celular: a ordem que o carrossel segue
 * (a mesma da prateleira do catálogo) e as setas do teclado. Os controles na
 * tela ficam no próprio carrossel; a troca em si é da página (PhoneDetail).
 */

import { useEffect, useState } from "react";
import { listarCelulares, type Celular } from "@/src/lib/celulares";

/** Mesmo limite do índice da busca: cobre o catálogo inteiro enquanto ele for pequeno. */
export const LIMITE_ORDEM = 100;

/**
 * Última lista do catálogo vista nesta aba. Quem vem do catálogo já encontra a
 * ordem pronta, então o carrossel existe na primeira renderização e a foto que
 * "voa" da prateleira cai direto no lugar dela (sem passar por um esqueleto).
 */
let ordemGuardada: Celular[] | null = null;

/**
 * Guarda a lista do catálogo (mesma ordem, até LIMITE_ORDEM itens). Uma lista
 * parcial (a primeira página da prateleira) não substitui uma maior já guardada.
 */
export function lembrarOrdemCelulares(celulares: Celular[], parcial = false) {
  if (parcial && ordemGuardada && ordemGuardada.length > celulares.length) return;
  ordemGuardada = celulares;
}

let buscandoOrdem: Promise<void> | null = null;

/**
 * Busca a ordem completa em segundo plano (uma vez por aba). A Home e o
 * catálogo chamam ao abrir: assim, de qualquer um dos dois, a página do celular
 * já nasce com o carrossel, mesmo que o aparelho não esteja na primeira página.
 */
export function prepararOrdemCelulares() {
  // a página do celular revalida a lista ao abrir; aqui basta uma busca por aba
  buscandoOrdem ??= listarCelulares(1, LIMITE_ORDEM)
    .then(({ celulares }) => lembrarOrdemCelulares(celulares))
    .catch(() => {
      buscandoOrdem = null; // tenta de novo na próxima vez
    });
}

/** Lista do catálogo na ordem da prateleira, ou null enquanto carrega (ou se falhou). */
export function useOrdemCelulares(): Celular[] | null {
  const [ordem, setOrdem] = useState<Celular[] | null>(ordemGuardada);

  useEffect(() => {
    // mesmo com a lista guardada, busca de novo para pegar notas e aparelhos novos
    const controller = new AbortController();
    listarCelulares(1, LIMITE_ORDEM, controller.signal)
      .then(({ celulares }) => {
        lembrarOrdemCelulares(celulares);
        setOrdem(celulares);
      })
      .catch(() => {
        // sem a lista, o carrossel mostra só o celular aberto
      });
    return () => controller.abort();
  }, []);

  return ordem;
}

/** Campos de texto e abas usam as setas para outra coisa. */
function setasOcupadas(alvo: EventTarget | null) {
  if (!(alvo instanceof HTMLElement)) return false;
  if (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)) return true;
  return alvo.closest('[role="tablist"]') !== null;
}

/** ← e → trocam de celular (fora de campos de texto e das abas). */
export function useTeclasDeTroca(onAnterior: (() => void) | null, onProximo: (() => void) | null) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (setasOcupadas(event.target)) return;
      if (event.key === "ArrowLeft" && onAnterior) {
        event.preventDefault();
        onAnterior();
      } else if (event.key === "ArrowRight" && onProximo) {
        event.preventDefault();
        onProximo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onAnterior, onProximo]);
}
