"use client";

/**
 * Busca o catálogo uma vez, no cliente, e divide o resultado entre os telões
 * (destaque, TVs, marcas e o contador do térreo). O cenário e os textos fixos
 * vêm prontos do servidor; só os telões esperam a API.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Celular } from "@/src/lib/celulares";
import { buscarCatalogo } from "@/src/lib/predio/catalogo";

export type EstadoCatalogo = "carregando" | "erro" | "pronto";

type Catalogo = {
  estado: EstadoCatalogo;
  celulares: Celular[];
  /** paginacao.totalItems da API; null enquanto não carregou. */
  total: number | null;
  tentarDeNovo: () => void;
};

const ContextoCatalogo = createContext<Catalogo | null>(null);

type Resultado = { estado: EstadoCatalogo; celulares: Celular[]; total: number | null };

const CARREGANDO: Resultado = { estado: "carregando", celulares: [], total: null };

export function ProvedorCatalogo({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState(0);
  const [resultado, setResultado] = useState<Resultado>(CARREGANDO);

  useEffect(() => {
    const controle = new AbortController();
    buscarCatalogo(controle.signal)
      .then(({ celulares, paginacao }) =>
        setResultado({ estado: "pronto", celulares, total: paginacao.totalItems }),
      )
      .catch(() => {
        if (!controle.signal.aborted) setResultado({ estado: "erro", celulares: [], total: null });
      });
    return () => controle.abort();
  }, [pedido]);

  const tentarDeNovo = useCallback(() => {
    setResultado(CARREGANDO);
    setPedido((n) => n + 1);
  }, []);

  const valor = useMemo(() => ({ ...resultado, tentarDeNovo }), [resultado, tentarDeNovo]);

  return <ContextoCatalogo.Provider value={valor}>{children}</ContextoCatalogo.Provider>;
}

export function useCatalogo(): Catalogo {
  const catalogo = useContext(ContextoCatalogo);
  if (!catalogo) throw new Error("useCatalogo precisa do <ProvedorCatalogo>.");
  return catalogo;
}
