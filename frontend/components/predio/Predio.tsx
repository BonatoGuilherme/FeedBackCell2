/**
 * A home em forma de prédio: a rolagem desce pela fachada, do céu (R) ao
 * térreo (T). Componente de servidor: cenário, textos fixos e o h1 saem prontos
 * no HTML; só os telões com dados da API carregam no cliente.
 */

import { cn } from "@/lib/utils";
import { ProvedorCatalogo } from "./telas/ProvedorCatalogo";
import { Elevador } from "./navegacao/Elevador";
import { Topo } from "./andares/Topo";
import { EmDestaque } from "./andares/EmDestaque";
import { Catalogo } from "./andares/Catalogo";
import { Passarela } from "./andares/Passarela";
import { ComoFunciona } from "./andares/ComoFunciona";
import { Marcas } from "./andares/Marcas";
import { Adicionar } from "./andares/Adicionar";
import { Terreo } from "./andares/Terreo";

export function Predio({ className }: { className?: string }) {
  return (
    <div className={cn("predio", className)}>
      <ProvedorCatalogo>
        {/* primeiro na ordem de tab: o elevador funciona como um índice da página */}
        <Elevador />
        <Topo />
        <EmDestaque />
        <Catalogo />
        <Passarela />
        <ComoFunciona />
        <Marcas />
        <Adicionar />
        <Terreo />
      </ProvedorCatalogo>
    </div>
  );
}
