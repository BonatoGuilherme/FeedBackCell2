"use client";

/**
 * Indicadores do painel, calculados a partir do catálogo real:
 * total de celulares, marcas, nota média das avaliações e o cadastro mais recente.
 * Os números contam do zero até o valor quando aparecem.
 */

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { Layers, Smartphone, Sparkles, Star } from "lucide-react";
import { listarCelulares, type Celular } from "@/src/lib/celulares";
import { TiltCard } from "@/components/ui/tilt-card";
import { Reveal, RevealItem } from "@/components/ui/reveal";

type Stats = {
  total: number;
  marcas: number;
  /** Média ponderada pelo número de avaliações de cada aparelho (0 se ninguém avaliou). */
  notaMedia: number;
  avaliacoes: number;
  recente: Celular | null;
};

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        el.textContent = format(n);
      },
    });
    return () => controls.stop();
  }, [format, inView, reduce, value]);

  return <span ref={ref}>{format(0)}</span>;
}

const inteiro = (n: number) => Math.round(n).toLocaleString("pt-BR");
const nota = (n: number) => decimal.format(n);

export default function HomeStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listarCelulares(1, 50, controller.signal)
      .then(({ celulares, paginacao }) => {
        let soma = 0;
        let avaliacoes = 0;
        for (const c of celulares) {
          if (c.notaMedia === null) continue;
          soma += c.notaMedia * c.avaliacoes;
          avaliacoes += c.avaliacoes;
        }
        setStats({
          total: paginacao.totalItems,
          marcas: new Set(celulares.map((c) => c.marca.trim().toLowerCase())).size,
          notaMedia: avaliacoes ? soma / avaliacoes : 0,
          avaliacoes,
          recente: celulares[0] ?? null,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setErro(true);
      });
    return () => controller.abort();
  }, []);

  const tiles = [
    {
      icon: Smartphone,
      label: "Celulares no catálogo",
      tone: "ochre",
      value: stats ? <CountUp value={stats.total} format={inteiro} /> : null,
      foot: "cadastrados pela comunidade",
    },
    {
      icon: Layers,
      label: "Marcas diferentes",
      tone: "lapis",
      value: stats ? <CountUp value={stats.marcas} format={inteiro} /> : null,
      foot: "entre os últimos 50",
    },
    {
      icon: Star,
      label: "Nota média",
      tone: "verdigris",
      value: stats ? (stats.avaliacoes ? <CountUp value={stats.notaMedia} format={nota} /> : "—") : null,
      foot: stats?.avaliacoes
        ? `${inteiro(stats.avaliacoes)} ${stats.avaliacoes === 1 ? "avaliação" : "avaliações"}, de 1 a 5`
        : "nenhuma avaliação ainda",
      small: stats ? !stats.avaliacoes : false,
    },
    {
      icon: Sparkles,
      label: "Mais recente",
      tone: "sienna",
      value: stats ? (stats.recente ? stats.recente.modelo : "—") : null,
      foot: stats?.recente ? stats.recente.marca : "nenhum cadastro ainda",
      small: true,
    },
  ];

  return (
    <section aria-label="Indicadores do catálogo">
      <Reveal className="stats" stagger={0.08}>
        {tiles.map(({ icon: Icon, label, tone, value, foot, small }) => (
          <RevealItem key={label}>
            <TiltCard className={`stat card stat--${tone}`} max={10}>
              <span className="stat__icon">
                <Icon size={17} strokeWidth={1.8} aria-hidden />
              </span>
              <p className="stat__label">{label}</p>
              <p className={small ? "stat__value stat__value--small" : "stat__value"}>
                {value ?? (erro ? "—" : <span className="stat__skeleton" aria-label="Carregando" />)}
              </p>
              <p className="stat__foot">{erro ? "não foi possível carregar" : foot}</p>
              <span className="stat__bar" aria-hidden />
            </TiltCard>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}
