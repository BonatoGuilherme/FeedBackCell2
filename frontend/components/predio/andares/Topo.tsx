/**
 * R — céu e telhado: espaço da lua (fase posterior), o telão com o h1,
 * a faixa de LED (estática por ora) e os dois botões principais.
 */

import Link from "next/link";
import { idTitulo } from "@/src/lib/predio/andares";
import { LinkAdicionar } from "../telas/LinksConta";
import { PlacaJp } from "../telas/Telao";

const FAIXA_LED =
  "fichas, fotos e notas de celulares ✦ informe marca e modelo ✦ a ficha técnica e a foto chegam sozinhas ✦ dê sua nota de 1 a 5 ✦";

export function Topo() {
  return (
    <section id="topo" tabIndex={-1} aria-labelledby={idTitulo("topo")} className="andar andar--topo">
      {/* a lua cortada no topo entra numa fase posterior */}
      <div className="topo__lua" aria-hidden="true" />
      <div className="topo__telhado" aria-hidden="true" />

      <div className="andar__fachada">
        <div className="telao telao--letreiro">
          <span className="telao__selo">
            <span aria-hidden="true">●</span> NO AR
          </span>
          <PlacaJp texto="スマホ図鑑" significado="enciclopédia de smartphones" className="topo__placa" />
          <h1 id={idTitulo("topo")} className="topo__titulo">
            FEEDBACK <span>CELL</span>
          </h1>
          <p className="topo__led">{FAIXA_LED}</p>
        </div>

        <div className="btns topo__botoes">
          <Link className="btn-sign btn-sign--primary" href="/catalogo">
            Ver o catálogo
          </Link>
          <LinkAdicionar className="btn-sign">Adicionar celular</LinkAdicionar>
        </div>

        <p className="topo__descer">
          <span aria-hidden="true">↓</span> desça pelo prédio
        </p>
      </div>
    </section>
  );
}
