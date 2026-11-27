"use client";

/**
 * Painel de embarque da página inicial: os números do catálogo real (total de
 * celulares, marcas, nota média e avaliações) e os últimos cadastros, cada um
 * numa plaquinha que "vira" ao aparecer na tela.
 *
 * useResumoCatalogo() faz uma única chamada à API e a reaproveita entre o painel
 * e o outdoor do topo da página.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { listarCelulares, type Celular } from "@/src/lib/celulares";

type Resumo = { total: number; celulares: Celular[] };
type EstadoResumo = "carregando" | "pronto" | "erro";

// uma requisição por visita à página, compartilhada pelos componentes da home
let pedido: Promise<Resumo> | null = null;

function carregarResumo() {
  pedido ??= listarCelulares(1, 50).then(({ celulares, paginacao }) => ({
    total: paginacao.totalItems,
    celulares,
  }));
  pedido.catch(() => {
    pedido = null;
  });
  return pedido;
}

export function useResumoCatalogo() {
  const [estado, setEstado] = useState<EstadoResumo>("carregando");
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarResumo()
      .then((r) => {
        if (!ativo) return;
        setResumo(r);
        setEstado("pronto");
      })
      .catch(() => {
        if (ativo) setEstado("erro");
      });
    return () => {
      ativo = false;
      // a próxima visita à home busca de novo
      pedido = null;
    };
  }, []);

  return { estado, total: resumo?.total ?? 0, celulares: resumo?.celulares ?? [] };
}

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const inteiro = (n: number) => Math.round(n).toLocaleString("pt-BR");
const nota = (n: number) => decimal.format(n);

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
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        el.textContent = format(n);
      },
    });
    return () => controls.stop();
  }, [format, inView, reduce, value]);

  return <span ref={ref}>{format(0)}</span>;
}

type Linha = { rotulo: React.ReactNode; valor: React.ReactNode; destaque?: boolean };

function Plaquinha({ valor, destaque, indice }: { valor: React.ReactNode; destaque?: boolean; indice: number }) {
  return (
    <motion.b
      className={destaque ? "flap__value flap__value--go" : "flap__value"}
      initial={{ opacity: 0, rotateX: 90 }}
      whileInView={{ opacity: 1, rotateX: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.3, delay: indice * 0.12, ease: [0.5, 0, 0.5, 1] }}
    >
      {valor}
    </motion.b>
  );
}

function Painel({ titulo, nota: notaTitulo, linhas }: { titulo: string; nota: string; linhas: Linha[] }) {
  return (
    <div>
      <h3 className="board__title">
        {titulo} <span>{notaTitulo}</span>
      </h3>
      <ul>
        {linhas.map((l, i) => (
          <li key={i} className="flap">
            <span className="min-w-0">{l.rotulo}</span>
            <Plaquinha valor={l.valor} destaque={l.destaque} indice={i} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomeStats() {
  const { estado, total, celulares } = useResumoCatalogo();

  let soma = 0;
  let avaliacoes = 0;
  for (const c of celulares) {
    if (c.notaMedia === null) continue;
    soma += c.notaMedia * c.avaliacoes;
    avaliacoes += c.avaliacoes;
  }
  const marcas = new Set(celulares.map((c) => c.marca.trim().toLowerCase())).size;

  const pendente = (v: React.ReactNode) =>
    estado === "carregando" ? <span className="flap__skeleton" aria-label="Carregando" /> : estado === "erro" ? "—" : v;

  const numeros: Linha[] = [
    { rotulo: "Celulares no catálogo", valor: pendente(<CountUp value={total} format={inteiro} />) },
    { rotulo: "Marcas diferentes (últimos 50)", valor: pendente(<CountUp value={marcas} format={inteiro} />) },
    {
      rotulo: "Nota média, de 1 a 5",
      valor: pendente(avaliacoes ? <CountUp value={soma / avaliacoes} format={nota} /> : "—"),
    },
    { rotulo: "Avaliações publicadas", valor: pendente(<CountUp value={avaliacoes} format={inteiro} />) },
    {
      rotulo: estado === "erro" ? "Não foi possível carregar os números" : "Atualizado agora, direto da API",
      valor: estado === "erro" ? "ERRO" : "AO VIVO",
      destaque: true,
    },
  ];

  const recentes: Linha[] =
    estado === "pronto" && celulares.length
      ? celulares.slice(0, 4).map((c) => ({
          rotulo: (
            <Link className="flap__link" href={`/catalogo/${c.idcelular}`}>
              {c.marca} {c.modelo}
            </Link>
          ),
          valor: c.notaMedia !== null && c.avaliacoes ? nota(c.notaMedia) : "NOVO",
        }))
      : [
          {
            rotulo:
              estado === "carregando"
                ? "Buscando os últimos cadastros…"
                : estado === "erro"
                  ? "O catálogo está fora do ar agora"
                  : "Nenhum celular cadastrado ainda",
            valor: pendente("—"),
          },
        ];
  recentes.push({
    rotulo: (
      <Link className="flap__link" href="/catalogo">
        Ver o catálogo inteiro
      </Link>
    ),
    valor: "IR",
    destaque: true,
  });

  return (
    <section className="board" aria-label="Números do catálogo">
      <Painel titulo="Painel do catálogo" nota="números reais" linhas={numeros} />
      <Painel titulo="Chegaram agora" nota="últimos cadastros" linhas={recentes} />
    </section>
  );
}
