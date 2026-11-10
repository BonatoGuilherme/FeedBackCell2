"use client";

/**
 * Indicador ativo que "estica" entre itens, como no dashboard de referência:
 * no meio do caminho a pílula se alonga cobrindo a distância e encolhe ao chegar.
 *
 * Anima só transform com a Web Animations API. Animações de transform rodam no
 * compositor (GPU), então continuam lisas enquanto a página nova é montada; uma
 * animação em JavaScript congelava nesse momento e "pulava" para o fim.
 *
 * A pílula é absolute no canto do contêiner, com o tamanho do item ativo.
 */

import { useLayoutEffect, type RefObject } from "react";

type Caixa = { x: number; y: number; w: number; h: number };

/*
 * Última posição de cada pílula, fora do componente: se o menu for recriado,
 * a pílula ainda desliza de onde estava em vez de aparecer no item novo.
 */
const ultimas: Record<"x" | "y", Caixa | null> = { x: null, y: null };

const DURACAO = 520;
const EASING = "cubic-bezier(0.65, 0, 0.25, 1)";

function caixaDe(alvo: HTMLElement): Caixa {
  return { x: alvo.offsetLeft, y: alvo.offsetTop, w: alvo.offsetWidth, h: alvo.offsetHeight };
}

const pos = (c: Caixa, sx = 1, sy = 1) => `translate(${c.x}px, ${c.y}px) scale(${sx}, ${sy})`;

/**
 * @param containerRef  elemento relativo que contém os itens e a pílula
 * @param pillRef       a pílula
 * @param activeKey     chave do item ativo; os itens têm data-pill-key
 * @param axis          "y" para menu vertical, "x" para abas horizontais
 */
export function useSlidePill(
  containerRef: RefObject<HTMLElement | null>,
  pillRef: RefObject<HTMLElement | null>,
  activeKey: string | null,
  axis: "x" | "y" = "y",
) {
  useLayoutEffect(() => {
    const box = containerRef.current;
    const pill = pillRef.current;
    if (!box || !pill) return;

    const alvo = activeKey
      ? box.querySelector<HTMLElement>(`[data-pill-key="${CSS.escape(activeKey)}"]`)
      : null;

    // sem item ativo, ou menu escondido nesta largura de tela
    if (!alvo || alvo.offsetWidth === 0) {
      pill.style.opacity = "0";
      return;
    }

    const para = caixaDe(alvo);
    const de = ultimas[axis];
    ultimas[axis] = para;

    pill.style.width = `${para.w}px`;
    pill.style.height = `${para.h}px`;
    pill.style.transform = pos(para);
    pill.style.opacity = "1";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!de || reduce || (de.x === para.x && de.y === para.y)) return;

    // no meio do caminho a pílula fica entre os dois itens, esticada no sentido
    // do movimento e um pouco mais fina no outro (efeito de "gota")
    const meio: Caixa = { ...para, x: (de.x + para.x) / 2, y: (de.y + para.y) / 2 };
    const dist = axis === "y" ? Math.abs(para.y - de.y) : Math.abs(para.x - de.x);
    const tamanho = axis === "y" ? para.h : para.w;
    const estica = 1 + (dist * 0.75) / tamanho;
    const afina = 0.9;

    pill.getAnimations().forEach((a) => a.cancel());
    pill.animate(
      [
        { transform: pos(de), offset: 0 },
        { transform: axis === "y" ? pos(meio, afina, estica) : pos(meio, estica, afina), offset: 0.5 },
        { transform: pos(para), offset: 1 },
      ],
      { duration: DURACAO, easing: EASING },
    );
  }, [activeKey, axis, containerRef, pillRef]);

  // reposiciona sem animar só se o menu mudar de tamanho de verdade
  // (o ResizeObserver também dispara ao começar a observar; esse é ignorado)
  useLayoutEffect(() => {
    const box = containerRef.current;
    const pill = pillRef.current;
    if (!box || !pill || typeof ResizeObserver === "undefined") return;
    let largura = box.offsetWidth;
    let altura = box.offsetHeight;
    const ro = new ResizeObserver(() => {
      if (box.offsetWidth === largura && box.offsetHeight === altura) return;
      largura = box.offsetWidth;
      altura = box.offsetHeight;
      const alvo = activeKey
        ? box.querySelector<HTMLElement>(`[data-pill-key="${CSS.escape(activeKey)}"]`)
        : null;
      if (!alvo || alvo.offsetWidth === 0) return;
      const c = caixaDe(alvo);
      ultimas[axis] = c;
      pill.style.width = `${c.w}px`;
      pill.style.height = `${c.h}px`;
      pill.style.transform = pos(c);
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [activeKey, axis, containerRef, pillRef]);
}
