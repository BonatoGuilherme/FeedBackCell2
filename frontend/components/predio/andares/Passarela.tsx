/**
 * Passarela entre prédios: só uma divisória (sem número no elevador).
 * Numa fase posterior um monotrilho passa por aqui.
 */

import { idTitulo } from "@/src/lib/predio/andares";

export function Passarela() {
  return (
    <section id="passarela" aria-labelledby={idTitulo("passarela")} className="andar andar--passarela">
      <div className="passarela__ponte">
        <h2 id={idTitulo("passarela")} className="passarela__placa">
          Passarela
        </h2>
      </div>
    </section>
  );
}
