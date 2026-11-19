"use client";

/**
 * Página de um celular (/catalog/ID): num painel só, a ficha (fotos ou modelo
 * 3D, nota, destaques e especificações), a faixa com outros aparelhos da marca
 * e, embaixo do divisor, as avaliações da comunidade.
 */

import Link from "next/link";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  ArrowLeft,
  BatteryCharging,
  Camera,
  Cpu,
  MessageSquareText,
  RefreshCw,
  SearchX,
  Smartphone,
} from "lucide-react";
import { buscarCelular, listarCelulares, type Celular, type Especificacoes } from "@/src/lib/celulares";
import { ApiError } from "@/src/lib/http";
import { PhonePhoto } from "@/components/ui/phone-photo";
import { PhoneArt, PhoneMiniCard, ROTULOS_ESPECIFICACOES } from "@/components/ui/phone-shelf";
import { NotaResumo } from "@/components/ui/rating";
import { PrecoLancamento } from "@/components/ui/preco-lancamento";
import PhoneComments from "./PhoneComments";

type Estado =
  | { status: "loading" }
  | { status: "ok"; celular: Celular }
  | { status: "not-found" }
  | { status: "error"; message: string };

export default function PhoneDetail({ idcelular }: { idcelular: number | null }) {
  const [estado, setEstado] = useState<Estado>(idcelular === null ? { status: "not-found" } : { status: "loading" });
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (idcelular === null) return;
    const controller = new AbortController();
    buscarCelular(idcelular, controller.signal)
      .then((celular) => setEstado({ status: "ok", celular }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 404) {
          setEstado({ status: "not-found" });
          return;
        }
        // numa recarga (depois de comentar) mantém o que já está na tela
        setEstado((atual) =>
          atual.status === "ok"
            ? atual
            : { status: "error", message: error instanceof Error ? error.message : "Não foi possível carregar o celular." },
        );
      });
    return () => controller.abort();
  }, [idcelular, recarga]);

  // depois de comentar ou excluir, busca de novo para atualizar a média
  const recarregar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    if (estado.status === "ok") document.title = `${estado.celular.marca} ${estado.celular.modelo} · FeedBackCELL`;
  }, [estado]);

  return (
    <div className="page-shell phone-page">
      <Link className="back-link" href="/catalog">
        <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" />
        Catálogo
      </Link>

      {estado.status === "loading" ? (
        <div className="collection-message" role="status">
          <span className="loading-indicator" />
          Carregando celular…
        </div>
      ) : estado.status === "not-found" ? (
        <div className="collection-empty collection-empty--compact">
          <span className="collection-empty__icon">
            <SearchX size={22} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <h1>Celular não encontrado</h1>
          <p>Ele pode ter sido removido. Procure outro aparelho no catálogo.</p>
          <Link className="button button--primary" href="/catalog">
            Ir para o catálogo
          </Link>
        </div>
      ) : estado.status === "error" ? (
        <div className="collection-error" role="alert">
          <div>
            <h1>O celular não carregou</h1>
            <p>{estado.message}</p>
          </div>
          <button className="button button--secondary" type="button" onClick={recarregar}>
            <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      ) : (
        <Ficha celular={estado.celular} onAlterado={recarregar} />
      )}
    </div>
  );
}

/** Especificações de destaque, com ícone, mostradas numa faixa antes da lista. */
const DESTAQUES: [keyof Especificacoes, string, ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>][] = [
  ["tela", "Tela", Smartphone],
  ["hardware", "Chip", Cpu],
  ["camera", "Câmera", Camera],
  ["bateria", "Bateria", BatteryCharging],
];

const CAMPOS_DESTACADOS = new Set(DESTAQUES.map(([campo]) => campo));

function Destaques({ especificacoes }: { especificacoes: Especificacoes }) {
  const itens = DESTAQUES.filter(([campo]) => especificacoes[campo]);
  if (itens.length === 0) return null;

  return (
    <ul className="phone-highlights">
      {itens.map(([campo, rotulo, Icone]) => (
        <li key={campo} className="phone-highlights__item">
          <span className="phone-highlights__icon">
            <Icone size={17} strokeWidth={1.7} aria-hidden={true} />
          </span>
          <span className="phone-highlights__text">
            <span className="phone-highlights__label">{rotulo}</span>
            <span className="phone-highlights__value">{especificacoes[campo]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const MIN_DA_MARCA = 3;

/**
 * Faixa com outros aparelhos: os da mesma marca quando há pelo menos
 * MIN_DA_MARCA deles; senão, outros celulares do catálogo. Some quando não há
 * nada para mostrar (catálogo com um aparelho só, ou a lista falhou).
 */
function MaisAparelhos({ celular }: { celular: Celular }) {
  const [relacionados, setRelacionados] = useState<{ titulo: string; celulares: Celular[] } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listarCelulares(1, 24, controller.signal)
      .then(({ celulares }) => {
        const outros = celulares.filter((c) => c.idcelular !== celular.idcelular);
        const daMarca = outros.filter((c) => c.marca.toLowerCase() === celular.marca.toLowerCase());
        const [titulo, lista] =
          daMarca.length >= MIN_DA_MARCA
            ? [`Mais da ${celular.marca}`, daMarca]
            : ["Outros celulares", outros];
        setRelacionados(lista.length > 0 ? { titulo, celulares: lista.slice(0, 6) } : null);
      })
      .catch(() => setRelacionados(null));
    return () => controller.abort();
  }, [celular.idcelular, celular.marca]);

  if (!relacionados) return null;

  return (
    <section className="phone-related" aria-labelledby="mais-aparelhos">
      <h2 id="mais-aparelhos">{relacionados.titulo}</h2>
      <ul className="phone-related__list">
        {relacionados.celulares.map((outro) => (
          <li key={outro.idcelular}>
            <PhoneMiniCard celular={outro} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ficha({ celular, onAlterado }: { celular: Celular; onAlterado: () => void }) {
  const { especificacoes } = celular;
  const specs = especificacoes
    ? ROTULOS_ESPECIFICACOES.filter(([campo]) => especificacoes[campo] && !CAMPOS_DESTACADOS.has(campo))
    : [];

  return (
    <div className="phone-panel">
      <article className="phone-detail">
        <div className="phone-detail__media">
          <PhonePhoto celular={celular} placeholder={<PhoneArt celular={celular} />} />
        </div>

        <div className="phone-detail__info">
          <p className="eyebrow">{celular.marca}</p>
          <h1>{celular.modelo}</h1>
          <a className="phone-detail__rating" href="#comentarios">
            <NotaResumo notaMedia={celular.notaMedia} avaliacoes={celular.avaliacoes} />
          </a>
          {celular.descricao && <p className="phone-detail__description">{celular.descricao}</p>}

          {especificacoes && <Destaques especificacoes={especificacoes} />}

          {specs.length > 0 && (
            <dl className="phone-detail__specs">
              {specs.map(([campo, rotulo]) => (
                <div key={campo}>
                  <dt>{rotulo}</dt>
                  <dd>
                    {campo === "precoEstimado" ? (
                      <PrecoLancamento estimado={especificacoes?.precoEstimado ?? null} original={especificacoes?.precoLancamento ?? null} />
                    ) : (
                      especificacoes?.[campo]
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {celular.dataCriacao && (
            <p className="phone-detail__meta">
              Cadastrado em{" "}
              <time dateTime={celular.dataCriacao}>{new Date(celular.dataCriacao).toLocaleDateString("pt-BR")}</time>
            </p>
          )}

          <a className="button button--primary phone-detail__cta" href="#comentarios">
            <MessageSquareText size={17} strokeWidth={1.8} aria-hidden="true" />
            Avaliar este celular
          </a>
        </div>
      </article>

      <MaisAparelhos celular={celular} />

      <PhoneComments
        idcelular={celular.idcelular}
        notaMedia={celular.notaMedia}
        avaliacoes={celular.avaliacoes}
        onAlterado={onAlterado}
      />
    </div>
  );
}
