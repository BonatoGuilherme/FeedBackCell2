/**
 * T — Térreo: marquise, porta de entrada com os botões finais e a placa de
 * endereço como rodapé.
 */

import Link from "next/link";
import { LinkAdicionar, LinkEntrar } from "../telas/LinksConta";
import { ContadorCatalogo } from "../telas/ContadorCatalogo";
import { Andar, PlacaJp, Telao } from "../telas/Telao";

const GITHUB = "https://github.com/BonatoGuilherme/FeedBackCell2";

export function Terreo() {
  const ano = new Date().getFullYear();
  return (
    <Andar id="entrada">
      <div className="terreo__marquise" aria-hidden="true" />
      <Telao
        id="entrada"
        titulo="Térreo"
        className="telao--porta"
        placa={<PlacaJp texto="24時間" significado="24 horas" className="placa-jp--ambar" />}
      >
        <div className="porta">
          <p className="porta__placa">
            <PlacaJp texto="入口" significado="entrada" /> ENTRADA
          </p>
          <ContadorCatalogo />
          <div className="btns porta__botoes">
            <Link className="btn-sign btn-sign--primary" href="/catalogo">
              Entrar no catálogo
            </Link>
            <LinkAdicionar className="btn-sign">Adicionar celular</LinkAdicionar>
            <LinkEntrar className="btn-sign btn-sign--escuro" />
          </div>
        </div>
      </Telao>

      <footer className="endereco">
        <p className="endereco__placa">FeedBackCELL · Ed. Lua · nº 404</p>
        <nav aria-label="Rodapé do prédio">
          <ul className="endereco__links">
            <li>
              <Link href="/catalogo">Catálogo</Link>
            </li>
            <li>
              <LinkAdicionar>Adicionar</LinkAdicionar>
            </li>
            <li>
              <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                GitHub do projeto<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </li>
          </ul>
        </nav>
        <p className="endereco__autor">
          feito por Guilherme Bonato · <span>{ano}</span>
        </p>
      </footer>
    </Andar>
  );
}
