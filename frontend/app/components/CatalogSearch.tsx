"use client";

/**
 * Busca do catálogo com autocomplete: enquanto a pessoa digita, a prateleira é
 * filtrada e aparecem sugestões dos celulares já cadastrados (sem gastar
 * crédito da MobileAPI). Escolher uma sugestão abre a página do aparelho.
 * Teclado: setas navegam, Enter abre, Esc fecha (padrão "combobox" da WAI-ARIA).
 */

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import AppIcon from "./AppIcon";
import { listarCelulares, type Celular } from "@/src/lib/celulares";
import { NotaResumo } from "@/components/ui/rating";

const MAX_SUGESTOES = 6;
/** Limite máximo da API por página: cobre o catálogo inteiro enquanto ele for pequeno. */
const LIMITE_INDICE = 100;

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export default function CatalogSearch({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (texto: string) => void;
}) {
  const router = useRouter();
  const listaId = useId();
  const [indice, setIndice] = useState<Celular[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);

  // índice leve para as sugestões; carrega no primeiro foco
  const [pedirIndice, setPedirIndice] = useState(false);
  useEffect(() => {
    if (!pedirIndice || indice) return;
    const controller = new AbortController();
    listarCelulares(1, LIMITE_INDICE, controller.signal)
      .then(({ celulares }) => setIndice(celulares))
      .catch(() => {
        // sem sugestões; a busca continua filtrando a prateleira
      });
    return () => controller.abort();
  }, [indice, pedirIndice]);

  const sugestoes = useMemo(() => {
    const termo = normalizar(valor);
    if (!termo || !indice) return [];
    const palavras = termo.split(/\s+/);
    return indice
      .filter((c) => {
        const nome = normalizar(`${c.marca} ${c.modelo}`);
        return palavras.every((p) => nome.includes(p));
      })
      .slice(0, MAX_SUGESTOES);
  }, [indice, valor]);

  const mostrar = aberto && sugestoes.length > 0;

  function abrir(celular: Celular) {
    setAberto(false);
    router.push(`/catalogo/${celular.idcelular}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAberto(true);
      setAtivo((i) => (sugestoes.length ? (i + 1) % sugestoes.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setAtivo((i) => (sugestoes.length ? (i <= 0 ? sugestoes.length - 1 : i - 1) : -1));
    } else if (event.key === "Enter" && mostrar && ativo >= 0) {
      event.preventDefault();
      abrir(sugestoes[ativo]);
    } else if (event.key === "Escape") {
      setAberto(false);
      setAtivo(-1);
    }
  }

  return (
    <div className="catalog-search">
      <label className="search-field">
        <AppIcon name="search" size={19} />
        <span className="sr-only">Buscar celular</span>
        <input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mostrar}
          aria-controls={listaId}
          aria-activedescendant={mostrar && ativo >= 0 ? `${listaId}-${ativo}` : undefined}
          autoComplete="off"
          placeholder="Buscar marca ou modelo"
          value={valor}
          onFocus={() => {
            setPedirIndice(true);
            setAberto(true);
          }}
          onBlur={() => setAberto(false)}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            onChange(event.target.value);
            setAberto(true);
            setAtivo(-1);
          }}
        />
      </label>
      <ul id={listaId} role="listbox" aria-label="Sugestões de celulares" className="catalog-search__list" hidden={!mostrar}>
        {sugestoes.map((c, i) => (
          <li
            key={c.idcelular}
            id={`${listaId}-${i}`}
            role="option"
            aria-selected={i === ativo}
            className="catalog-search__option"
            // mousedown (antes do blur do campo) para o clique não se perder
            onMouseDown={(event) => {
              event.preventDefault();
              abrir(c);
            }}
            onMouseEnter={() => setAtivo(i)}
          >
            <span className="catalog-search__name">
              <span className="catalog-search__brand">{c.marca}</span> {c.modelo}
            </span>
            <NotaResumo compacto notaMedia={c.notaMedia} avaliacoes={c.avaliacoes} className="catalog-search__rating" />
          </li>
        ))}
      </ul>
    </div>
  );
}
