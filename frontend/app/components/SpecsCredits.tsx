"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { buscarCreditosEspecificacoes, type CreditosBusca } from "@/src/lib/celulares";
import { getToken } from "@/src/lib/session";

export type SaldoBusca =
  | { estado: "carregando" }
  | { estado: "ok"; creditos: CreditosBusca }
  | { estado: "erro" };

/**
 * Saldo da busca automática (GET /celulares/especificacoes/creditos). Erro ou 503 não
 * bloqueia nada: só some o saldo e quem decide é o core-api, na hora da busca.
 */
export function useCreditosBusca(): { saldo: SaldoBusca; atualizar: () => void } {
  const [saldo, setSaldo] = useState<SaldoBusca>({ estado: "carregando" });
  const controller = useRef<AbortController | null>(null);

  const atualizar = useCallback(() => {
    const token = getToken();
    if (!token) return;
    controller.current?.abort();
    const atual = new AbortController();
    controller.current = atual;
    buscarCreditosEspecificacoes(token, atual.signal)
      .then((creditos) => setSaldo({ estado: "ok", creditos }))
      .catch(() => {
        if (!atual.signal.aborted) setSaldo({ estado: "erro" });
      });
  }, []);

  useEffect(() => {
    atualizar();
    return () => controller.current?.abort();
  }, [atualizar]);

  return { saldo, atualizar };
}

function textoDoSaldo(saldo: SaldoBusca): string {
  if (saldo.estado === "carregando") return "Consultando seu saldo de buscas…";
  if (saldo.estado === "erro") return "Não foi possível consultar o saldo de buscas agora.";
  const { usuarioPodeBuscarHoje, restantesMes } = saldo.creditos;
  const hoje = usuarioPodeBuscarHoje
    ? "Você tem 1 busca automática hoje"
    : "Você já usou a busca automática de hoje";
  if (restantesMes === null) return hoje;
  return `${hoje} · ${restantesMes} ${restantesMes === 1 ? "crédito restante" : "créditos restantes"} no mês`;
}

/** Linha com o saldo, embaixo do campo Modelo. */
export function AvisoCreditos({ saldo }: { saldo: SaldoBusca }) {
  return (
    <span className="modelo-autocomplete__hint" data-testid="saldo-busca" aria-live="polite">
      <Info size={14} aria-hidden="true" />
      {textoDoSaldo(saldo)}
    </span>
  );
}
