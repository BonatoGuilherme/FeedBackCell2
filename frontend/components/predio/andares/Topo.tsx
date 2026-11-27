/**
 * R — céu e telhado. Atrás: céu com grão, estrelas e a lua pintada, cada
 * camada com seu parallax. Na frente: o telão de LED com o h1 (sai pronto do
 * servidor; é o LCP), a faixa corrida, o telhado e o começo da fachada com os
 * botões principais.
 */

import Link from "next/link";
import { idTitulo } from "@/src/lib/predio/andares";
import { Parallax } from "../camadas/Parallax";
import { Estrelas } from "../camadas/Estrelas";
import { Lua } from "../camadas/Lua";
import { Telhado, Trelica } from "../detalhes/Telhado";
import { TelaoLed } from "../telas/TelaoLed";
import { FaixaLed } from "../telas/FaixaLed";
import { LinkAdicionar } from "../telas/LinksConta";
import { PlacaJp } from "../telas/Telao";
import { DicaDescer } from "../navegacao/DicaDescer";

const FAIXA_LED =
  "fichas, fotos e notas de celulares ✦ informe marca e modelo ✦ a ficha técnica e a foto chegam sozinhas ✦ dê sua nota de 1 a 5 ✦";

export function Topo() {
  return (
    <section id="topo" tabIndex={-1} aria-labelledby={idTitulo("topo")} className="andar andar--topo">
      <div className="topo__ceu" aria-hidden="true">
        <Parallax velocidade={0.05} className="camada--estrelas">
          <Estrelas />
        </Parallax>
        <Parallax velocidade={0.25} className="camada--lua">
          <Lua />
        </Parallax>
        <div className="topo__grao" />
      </div>

      <div className="andar__fachada topo__cena">
        <div className="topo__estrutura">
          <Telhado />
          <TelaoLed>
            <h1 id={idTitulo("topo")} className="topo__titulo" data-texto="FEEDBACK CELL">
              FEEDBACK <span>CELL</span>
            </h1>
          </TelaoLed>
          <Trelica />
        </div>

        <FaixaLed texto={FAIXA_LED} />
        <div className="topo__mureta" aria-hidden="true" />

        <div className="topo__predio">
          <PlacaJp texto="スマホ図鑑" significado="enciclopédia de smartphones" className="topo__vertical" />
          <div className="btns topo__botoes">
            <Link className="btn-sign btn-sign--primary" href="/catalogo">
              Ver o catálogo
            </Link>
            <LinkAdicionar className="btn-sign">Adicionar celular</LinkAdicionar>
          </div>
          <DicaDescer />
        </div>
      </div>
    </section>
  );
}
