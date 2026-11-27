"use client";

/**
 * 5 — Em destaque: os 3 celulares com maior nota (desempate pelo número de
 * avaliações), um por vez, trocados por ‹ › ou pelas bolinhas. Sem rotação
 * automática nesta fase.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { emDestaque, textoAvaliacoes, textoNota } from "@/src/lib/predio/catalogo";
import { useCatalogo } from "../telas/ProvedorCatalogo";
import { EstadoTelao } from "../telas/EstadoTelao";
import { FotoCelular } from "../telas/FotoCelular";
import { Andar, PlacaJp, Telao } from "../telas/Telao";

export function EmDestaque() {
  const { estado, celulares, tentarDeNovo } = useCatalogo();
  const destaques = useMemo(() => emDestaque(celulares), [celulares]);
  const [escolhido, setEscolhido] = useState(0);
  // a lista pode encolher ao recarregar: nunca aponta para fora dela
  const atual = destaques.length ? Math.min(escolhido, destaques.length - 1) : 0;
  const celular = destaques[atual];

  const mudar = (passo: number) => setEscolhido((atual + passo + destaques.length) % destaques.length);

  return (
    <Andar id="destaque">
      <Telao id="destaque" titulo="Em destaque" placa={<PlacaJp texto="人気" significado="popular" />}>
        <EstadoTelao
          estado={estado}
          vazio={destaques.length === 0}
          onTentarDeNovo={tentarDeNovo}
          conviteVazio={
            <>
              <p className="tela-estado__texto">Ninguém deu nota ainda. Escolha um aparelho e seja o primeiro.</p>
              <Link className="text-link" href="/catalogo">
                Avaliar um celular do catálogo
              </Link>
            </>
          }
        >
          {celular && (
            <div className="destaque" role="group" aria-roledescription="carrossel" aria-label="Celulares em destaque">
              <article
                className="destaque__item"
                aria-live="polite"
                aria-roledescription="destaque"
                aria-label={`${atual + 1} de ${destaques.length}`}
              >
                <FotoCelular celular={celular} className="destaque__foto" />
                <div className="destaque__info">
                  <p className="destaque__marca">{celular.marca}</p>
                  <h3 className="destaque__modelo">{celular.modelo}</h3>
                  <p className="destaque__nota">
                    <span className="sr-only">Nota média </span>
                    {textoNota(celular)}
                  </p>
                  <p className="destaque__avaliacoes">{textoAvaliacoes(celular.avaliacoes)}</p>
                  <Link className="btn-sign btn-sign--primary" href={`/catalogo/${celular.idcelular}`}>
                    Ver ficha<span className="sr-only"> do {celular.marca} {celular.modelo}</span>
                  </Link>
                </div>
              </article>

              {destaques.length > 1 && (
                <div className="destaque__controles">
                  <button type="button" className="destaque__seta" onClick={() => mudar(-1)} aria-label="Destaque anterior">
                    ‹
                  </button>
                  <ul className="destaque__bolinhas">
                    {destaques.map((c, i) => (
                      <li key={c.idcelular}>
                        <button
                          type="button"
                          className="destaque__bolinha"
                          aria-label={`Mostrar destaque ${i + 1} de ${destaques.length}: ${c.marca} ${c.modelo}`}
                          aria-pressed={i === atual}
                          onClick={() => setEscolhido(i)}
                        />
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="destaque__seta" onClick={() => mudar(1)} aria-label="Próximo destaque">
                    ›
                  </button>
                </div>
              )}
            </div>
          )}
        </EstadoTelao>
      </Telao>
    </Andar>
  );
}
