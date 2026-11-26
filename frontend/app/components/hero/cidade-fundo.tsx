"use client";

/**
 * Fundo do hero da home: céu, três planos de cidade cartoon (SVG gerado com
 * seed fixa, ver cidade-tras/cidade-frente) e o telão de rua.
 *
 * O telão mostra os celulares do catálogo, um a cada ~10 s, com o efeito de
 * TV de tubo desligando e voltando com estática. Sem dados, mostra a marca.
 * Tudo para quando o hero sai da tela ou a aba fica oculta, e fica parado
 * com prefers-reduced-motion. É decorativo (aria-hidden).
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { Celular } from "@/src/lib/celulares";
import { useResumoCatalogo } from "../HomeStats";
import { CEU, CIDADE_MEIO, HORIZONTE, LUA } from "./cidade-tras";
import { CIDADE_FRENTE } from "./cidade-frente";

const NO_AR_MS = 10_000;
const DESLIGANDO_MS = 450;
const ESTATICA_MS = 650;
const MAX_TELAS = 8;

type Fase = "ligado" | "desligando" | "estatica";

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function TelaMarca() {
  return (
    <div className="cid-telao__marca">
      <span className="cid-telao__logo">
        FeedBack<b>CELL</b>
      </span>
      <span className="cid-telao__sub">fichas · fotos · notas</span>
    </div>
  );
}

function TelaCelular({ celular }: { celular: Celular }) {
  const temNota = celular.notaMedia !== null && celular.avaliacoes > 0;
  return (
    <div className="cid-telao__cel">
      <span className="cid-telao__marca-cel">{celular.marca}</span>
      <span className="cid-telao__modelo">{celular.modelo}</span>
      <span className="cid-telao__nota">
        {temNota ? (
          <>
            <b>★ {decimal.format(celular.notaMedia ?? 0)}</b>
            <small>
              {celular.avaliacoes} {celular.avaliacoes === 1 ? "avaliação" : "avaliações"}
            </small>
          </>
        ) : (
          <small>sem nota ainda</small>
        )}
      </span>
    </div>
  );
}

function Telao({ ativo }: { ativo: boolean }) {
  const { estado, celulares } = useResumoCatalogo();
  const reduce = useReducedMotion();
  const telas = estado === "pronto" ? celulares.slice(0, MAX_TELAS) : [];
  // com um celular só, alterna entre ele e a marca
  const total = telas.length === 1 ? 2 : telas.length;
  const [indice, setIndice] = useState(0);
  const [fase, setFase] = useState<Fase>("ligado");
  const girar = ativo && !reduce && total > 1;

  useEffect(() => {
    if (!girar) return;
    const espera = fase === "ligado" ? NO_AR_MS : fase === "desligando" ? DESLIGANDO_MS : ESTATICA_MS;
    const t = window.setTimeout(() => {
      if (fase === "ligado") setFase("desligando");
      else if (fase === "desligando") setFase("estatica");
      else {
        setIndice((i) => (i + 1) % total);
        setFase("ligado");
      }
    }, espera);
    return () => window.clearTimeout(t);
  }, [girar, fase, total]);

  const atual = total > 0 ? telas[indice % total] : undefined;

  return (
    <div className="cid-telao" data-fase={girar ? fase : "ligado"}>
      <div className="cid-telao__moldura">
        <span className="cid-telao__aovivo">
          <i /> no ar
        </span>
        <div className="cid-telao__tela">
          <div className="cid-telao__conteudo" key={`${indice}-${atual ? "c" : "m"}`}>
            {atual ? <TelaCelular celular={atual} /> : <TelaMarca />}
          </div>
          <div className="cid-telao__estatica">
            <i className="cid-telao__ruido cid-telao__ruido--r" />
            <i className="cid-telao__ruido cid-telao__ruido--g" />
            <i className="cid-telao__ruido cid-telao__ruido--b" />
          </div>
          <i className="cid-telao__linha" />
          <i className="cid-telao__scan" />
        </div>
      </div>
      <i className="cid-telao__suporte" />
    </div>
  );
}

export default function CidadeFundo() {
  const ref = useRef<HTMLDivElement>(null);
  const [naTela, setNaTela] = useState(true);
  const [abaVisivel, setAbaVisivel] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNaTela(e.isIntersecting));
    io.observe(el);
    const aba = () => setAbaVisivel(document.visibilityState === "visible");
    aba();
    document.addEventListener("visibilitychange", aba);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", aba);
    };
  }, []);

  const ativo = naTela && abaVisivel;

  return (
    <div ref={ref} className={`cid-fundo${ativo ? "" : " cid-fundo--pausado"}`} aria-hidden>
      {CEU}
      {LUA}
      {HORIZONTE}
      <Telao ativo={ativo} />
      {CIDADE_MEIO}
      {CIDADE_FRENTE}
      <div className="cid-veu" />
    </div>
  );
}
