"use client";

/**
 * 2 — Parede de marcas: um letreiro por marca do catálogo, com a quantidade
 * de aparelhos. O catálogo não aceita filtro pela URL, então todos levam a /catalogo.
 */

import { useMemo } from "react";
import Link from "next/link";
import { contarMarcas, textoAparelhos } from "@/src/lib/predio/catalogo";
import { useCatalogo } from "../telas/ProvedorCatalogo";
import { EstadoTelao } from "../telas/EstadoTelao";
import { Andar, PlacaJp, Telao } from "../telas/Telao";
import { LinkAdicionar } from "../telas/LinksConta";

export function Marcas() {
  const { estado, celulares, total, tentarDeNovo } = useCatalogo();
  const marcas = useMemo(() => contarMarcas(celulares), [celulares]);
  // a contagem usa só os aparelhos carregados; avisa quando o catálogo tem mais
  const parcial = total !== null && total > celulares.length;

  return (
    <Andar id="marcas">
      <Telao id="marcas" titulo="Parede de marcas" placa={<PlacaJp texto="携帯" significado="celular" />}>
        <EstadoTelao
          estado={estado}
          vazio={marcas.length === 0}
          onTentarDeNovo={tentarDeNovo}
          conviteVazio={
            <>
              <p className="tela-estado__texto">Nenhuma marca na parede ainda.</p>
              <LinkAdicionar className="text-link">Adicionar um celular</LinkAdicionar>
            </>
          }
        >
          <ul className="marcas" aria-label="Marcas do catálogo">
            {marcas.map(({ marca, quantidade }) => (
              <li key={marca}>
                <Link className="letreiro-marca" href="/catalogo">
                  <span className="letreiro-marca__nome">{marca}</span>
                  <span className="letreiro-marca__qtd">{textoAparelhos(quantidade)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {parcial && (
            <p className="marcas__nota">
              Contagem dos {celulares.length.toLocaleString("pt-BR")} cadastros mais recentes.
            </p>
          )}
        </EstadoTelao>
      </Telao>
    </Andar>
  );
}
