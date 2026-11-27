"use client";

import { useCatalogo } from "./ProvedorCatalogo";

/** "N celulares no catálogo", só com o total real da API (nunca um número inventado). */
export function ContadorCatalogo() {
  const { estado, total } = useCatalogo();
  if (estado !== "pronto" || total === null) return null;
  return (
    <p className="porta__contador">
      {total === 1 ? "1 celular no catálogo" : `${total.toLocaleString("pt-BR")} celulares no catálogo`}
    </p>
  );
}
