"use client";

/**
 * Painel do elevador, fixo à direita: o andar atual num display de 7
 * segmentos, a direção da rolagem (▼/▲) e um botão por andar. No celular
 * (< 640px) vira um botão flutuante que abre a lista.
 *
 * O andar atual é o que cruza a linha do meio da tela (IntersectionObserver).
 * Com o Lenis ligado, o próprio Lenis faz a rolagem suave dos links "#andar";
 * sem ele (prefers-reduced-motion), a rolagem é instantânea.
 */

import { useEffect, useId, useState, type MouseEvent } from "react";
import { andares, type Andar } from "@/src/lib/predio/andares";
import { cn } from "@/lib/utils";
import { DisplaySeteSegmentos } from "./DisplaySeteSegmentos";

type Direcao = "desce" | "sobe";

function useAndarAtual(): string {
  const [atual, setAtual] = useState(andares[0].id);
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setAtual(e.target.id);
      },
      // uma faixa fina no meio da tela: só um andar por vez
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const a of andares) {
      const secao = document.getElementById(a.id);
      if (secao) observador.observe(secao);
    }
    return () => observador.disconnect();
  }, []);
  return atual;
}

function useDirecao(): Direcao {
  const [direcao, setDirecao] = useState<Direcao>("desce");
  useEffect(() => {
    let ultimo = window.scrollY;
    const aoRolar = () => {
      const y = window.scrollY;
      if (y !== ultimo) setDirecao(y > ultimo ? "desce" : "sobe");
      ultimo = y;
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);
  return direcao;
}

function irPara(evento: MouseEvent<HTMLAnchorElement>, andar: Andar) {
  const alvo = document.getElementById(andar.id);
  if (!alvo) return;
  evento.preventDefault();
  // o Lenis (classe "lenis" no <html>) já trata o clique em links "#..." com rolagem suave
  if (!document.documentElement.classList.contains("lenis")) {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    alvo.scrollIntoView({ behavior: reduzir ? "instant" : "smooth", block: "start" });
  }
  // o próximo Tab continua a partir do andar escolhido
  alvo.focus({ preventScroll: true });
}

export function Elevador() {
  const atual = useAndarAtual();
  const direcao = useDirecao();
  const [aberto, setAberto] = useState(false);
  const listaId = useId();
  const andarAtual = andares.find((a) => a.id === atual) ?? andares[0];

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const painel = (
    <span className="elevador__display">
      <DisplaySeteSegmentos numero={andarAtual.numero} className="elevador__digito" />
      <span className="elevador__direcao" aria-hidden="true">
        {direcao === "desce" ? "▼" : "▲"}
      </span>
    </span>
  );

  return (
    <nav className={cn("elevador", aberto && "elevador--aberto")} aria-label="Elevador do prédio">
      <p className="elevador__painel">
        {painel}
        <span className="sr-only">Andar atual: {andarAtual.nome}</span>
      </p>

      <button
        type="button"
        className="elevador__abrir"
        aria-expanded={aberto}
        aria-controls={listaId}
        onClick={() => setAberto((a) => !a)}
      >
        {painel}
        <span className="sr-only">{aberto ? "Fechar o elevador" : `Abrir o elevador (andar atual: ${andarAtual.nome})`}</span>
      </button>

      <ul id={listaId} className="elevador__botoes">
        {andares.map((a) => (
          <li key={a.id}>
            <a
              href={`#${a.id}`}
              className="elevador__botao"
              aria-label={`Ir para ${a.nome}`}
              aria-current={a.id === atual ? "location" : undefined}
              onClick={(e) => {
                irPara(e, a);
                setAberto(false);
              }}
            >
              {a.numero}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
