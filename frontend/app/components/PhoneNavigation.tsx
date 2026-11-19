"use client";

/**
 * Setas "anterior / próximo" da página do celular. A ordem é a mesma da
 * prateleira do catálogo. A troca usa um tipo de transição ("anterior" ou
 * "proximo") para o conteúdo deslizar para o lado certo, em vez de parecer
 * uma página nova. Teclado: ← e → (ignorado quando o foco está em campos).
 */

import { addTransitionType, startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppIcon from "./AppIcon";
import { listarCelulares, type Celular } from "@/src/lib/celulares";
import type { TipoNavegacaoCelular } from "@/components/ui/transicoes";

/** Mesmo limite do índice da busca: cobre o catálogo inteiro enquanto ele for pequeno. */
const LIMITE_ORDEM = 100;

function nome(celular: Celular) {
  return `${celular.marca} ${celular.modelo}`;
}

/** Campos de texto não devem ganhar as setas do teclado. */
function digitando(alvo: EventTarget | null) {
  if (!(alvo instanceof HTMLElement)) return false;
  return alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName);
}

export default function PhoneNavigation({ idcelular }: { idcelular: number }) {
  const router = useRouter();
  const [ordem, setOrdem] = useState<Celular[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listarCelulares(1, LIMITE_ORDEM, controller.signal)
      .then(({ celulares }) => setOrdem(celulares))
      .catch(() => {
        // sem setas se a lista não carregar; a página do celular continua funcionando
      });
    return () => controller.abort();
  }, [idcelular]);

  const posicao = ordem ? ordem.findIndex((c) => c.idcelular === idcelular) : -1;
  const anterior = posicao > 0 && ordem ? ordem[posicao - 1] : null;
  const proximo = posicao >= 0 && ordem && posicao < ordem.length - 1 ? ordem[posicao + 1] : null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (digitando(event.target)) return;
      if (event.key === "ArrowLeft" && anterior) {
        event.preventDefault();
        irParaCelular(router, anterior, "anterior");
      } else if (event.key === "ArrowRight" && proximo) {
        event.preventDefault();
        irParaCelular(router, proximo, "proximo");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anterior, proximo, router]);

  return (
    <nav className="phone-nav" aria-label="Celulares do catálogo">
      <button
        type="button"
        className="phone-nav__button phone-nav__button--anterior"
        disabled={!anterior}
        onClick={() => anterior && irParaCelular(router, anterior, "anterior")}
        aria-label={anterior ? `Anterior: ${nome(anterior)}` : "Anterior: não há"}
      >
        <AppIcon name="chevron-left" size={18} />
        <span>
          <small>Anterior</small>
          {anterior && <strong>{nome(anterior)}</strong>}
        </span>
      </button>
      <button
        type="button"
        className="phone-nav__button phone-nav__button--proximo"
        disabled={!proximo}
        onClick={() => proximo && irParaCelular(router, proximo, "proximo")}
        aria-label={proximo ? `Próximo: ${nome(proximo)}` : "Próximo: não há"}
      >
        <span>
          <small>Próximo</small>
          {proximo && <strong>{nome(proximo)}</strong>}
        </span>
        <AppIcon name="chevron-right" size={18} />
      </button>
    </nav>
  );
}

function irParaCelular(
  router: { push: (href: string) => void },
  celular: Celular,
  tipo: TipoNavegacaoCelular,
) {
  // o tipo tem que ser registrado dentro do startTransition (API do React)
  startTransition(() => {
    addTransitionType(tipo);
    router.push(`/catalog/${celular.idcelular}`);
  });
}
