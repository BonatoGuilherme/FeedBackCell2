"use client";

/**
 * 4 — Catálogo: uma parede de "TVs" com os aparelhos do catálogo (12 no
 * computador, 9 no tablet, 6 no celular; o CSS esconde as sobras) e, embaixo,
 * a busca com sugestões do site (filtra no cliente: não há endpoint de busca).
 */

import { useState } from "react";
import Link from "next/link";
import CatalogSearch from "@/app/components/CatalogSearch";
import { textoNota } from "@/src/lib/predio/catalogo";
import { useCatalogo } from "../telas/ProvedorCatalogo";
import { EstadoTelao } from "../telas/EstadoTelao";
import { FotoCelular } from "../telas/FotoCelular";
import { Andar, PlacaJp, Telao } from "../telas/Telao";
import { LinkAdicionar } from "../telas/LinksConta";

const TVS = 12;

export function Catalogo() {
  const { estado, celulares, tentarDeNovo } = useCatalogo();
  const [busca, setBusca] = useState("");
  const tvs = celulares.slice(0, TVS);

  return (
    <Andar id="catalogo">
      <Telao
        id="catalogo"
        titulo="Catálogo"
        placa={
          <span className="telao__placas">
            <PlacaJp texto="写真あり" significado="com foto" />
            <PlacaJp texto="仕様" significado="especificações" />
          </span>
        }
      >
        <EstadoTelao
          estado={estado}
          vazio={tvs.length === 0}
          onTentarDeNovo={tentarDeNovo}
          conviteVazio={
            <>
              <p className="tela-estado__texto">Nenhum celular no catálogo ainda.</p>
              <LinkAdicionar className="text-link">Adicionar o primeiro celular</LinkAdicionar>
            </>
          }
        >
          <ul className="tvs" aria-label="Celulares do catálogo">
            {tvs.map((c) => (
              <li key={c.idcelular} className="tvs__item">
                <Link className="tv" href={`/catalogo/${c.idcelular}`}>
                  <FotoCelular celular={c} className="tv__foto" />
                  <span className="tv__modelo">
                    <span className="tv__marca">{c.marca}</span> {c.modelo}
                  </span>
                  <span className="tv__nota">
                    <span className="sr-only">Nota média </span>
                    {textoNota(c)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </EstadoTelao>
      </Telao>

      <div className="painel-busca">
        <p className="painel-busca__rotulo">Procura um aparelho?</p>
        <CatalogSearch valor={busca} onChange={setBusca} />
        <Link className="btn-sign btn-sign--primary" href="/catalogo">
          Ver catálogo completo
        </Link>
      </div>
    </Andar>
  );
}
