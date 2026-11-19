"use client";

/**
 * Página de um celular (/celulares/ID): fotos ou modelo 3D, nota média,
 * descrição, especificações e, embaixo, as avaliações da comunidade.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageSquareText, RefreshCw, SearchX } from "lucide-react";
import { buscarCelular, type Celular } from "@/src/lib/celulares";
import { ApiError } from "@/src/lib/http";
import { PhonePhoto } from "@/components/ui/phone-photo";
import { PhoneArt, ROTULOS_ESPECIFICACOES } from "@/components/ui/phone-shelf";
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

function Ficha({ celular, onAlterado }: { celular: Celular; onAlterado: () => void }) {
  const { especificacoes } = celular;
  const specs = especificacoes ? ROTULOS_ESPECIFICACOES.filter(([campo]) => especificacoes[campo]) : [];

  return (
    <>
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

      <PhoneComments idcelular={celular.idcelular} onAlterado={onAlterado} />
    </>
  );
}
