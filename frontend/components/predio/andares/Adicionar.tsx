/** 1 — Adicionar celular: espaço do futuro holograma e o convite para cadastrar. */

import { Andar, PlacaJp, Telao } from "../telas/Telao";
import { LinkAdicionar } from "../telas/LinksConta";

export function Adicionar() {
  return (
    <Andar id="adicionar">
      <Telao id="adicionar" titulo="Adicionar celular" placa={<PlacaJp texto="新着" significado="novidades" />}>
        <div className="adicionar">
          {/* o holograma (SVG/CSS) entra numa fase posterior */}
          <div className="adicionar__holograma" aria-hidden="true" />
          <div className="adicionar__texto">
            <p>Seu celular não está aqui? Adicione.</p>
            <LinkAdicionar className="btn-sign btn-sign--primary">Adicionar celular</LinkAdicionar>
          </div>
        </div>
      </Telao>
    </Andar>
  );
}
