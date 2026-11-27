"use client";

/**
 * Tela de um telão dinâmico: carregando ("SINTONIZANDO…"), erro ("SEM SINAL"
 * com "Tentar de novo"), vazio (convite para agir) ou o conteúdo pronto.
 */

import type { ReactNode } from "react";
import type { EstadoCatalogo } from "./ProvedorCatalogo";

type Props = {
  estado: EstadoCatalogo;
  /** Se o conteúdo pronto está vazio (ex.: ninguém avaliou ainda). */
  vazio: boolean;
  /** Convite mostrado quando está vazio (texto e link). */
  conviteVazio: ReactNode;
  onTentarDeNovo: () => void;
  children: ReactNode;
};

export function EstadoTelao({ estado, vazio, conviteVazio, onTentarDeNovo, children }: Props) {
  if (estado === "carregando") {
    return (
      <div className="tela-estado" role="status" aria-busy="true">
        <p className="tela-estado__sinal">SINTONIZANDO…</p>
        <p className="tela-estado__texto">O servidor pode levar até 1 minuto para acordar.</p>
      </div>
    );
  }

  if (estado === "erro") {
    return (
      <div className="tela-estado tela-estado--erro" role="alert">
        <p className="tela-estado__sinal">SEM SINAL</p>
        <p className="tela-estado__texto">Não foi possível falar com o catálogo agora.</p>
        <button type="button" className="btn-sign tela-estado__botao" onClick={onTentarDeNovo}>
          Tentar de novo
        </button>
      </div>
    );
  }

  if (vazio) return <div className="tela-estado tela-estado--vazio">{conviteVazio}</div>;

  return <>{children}</>;
}
