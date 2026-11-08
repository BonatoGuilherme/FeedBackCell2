"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppIcon from "./AppIcon";
import {
  listarCelulares,
  type Celular,
  type ListaCelulares,
} from "@/src/lib/celulares";

type PhoneCollectionProps = {
  variant: "overview" | "catalog";
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function PhoneArtwork() {
  return (
    <div className="phone-artwork" aria-hidden="true">
      <div className="phone-artwork__device">
        <span className="phone-artwork__speaker" />
        <span className="phone-artwork__screen">
          <span />
          <span />
          <span />
        </span>
        <span className="phone-artwork__button" />
      </div>
    </div>
  );
}

function PhoneCard({ celular }: { celular: Celular }) {
  return (
    <article className="phone-card">
      <PhoneArtwork />
      <div className="phone-card__details">
        <p className="phone-card__brand">{celular.marca}</p>
        <h3>{celular.modelo}</h3>
        {celular.descricao && (
          <p className="phone-card__description">{celular.descricao}</p>
        )}
        <div className="phone-card__footer">
          <span className="phone-card__price">
            {celular.preco > 0
              ? currency.format(celular.preco)
              : "Preço não informado"}
          </span>
          <Link
              className="button button--text"
              href={`/comments?celular=${celular.idcelular}`}
          >
              Ver comentários
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="collection-empty">
      <span className="collection-empty__icon">
        <AppIcon name="smartphone" size={25} />
      </span>
      <h3>Nenhum celular no catálogo</h3>
      <p>Cadastre o primeiro aparelho para começar a organizar as informações.</p>
      <Link className="button button--primary" href="/items/new">
        <AppIcon name="plus" size={18} />
        Cadastrar celular
      </Link>
      {onRetry && (
        <button className="button button--text" type="button" onClick={onRetry}>
          <AppIcon name="refresh" size={17} />
          Atualizar lista
        </button>
      )}
    </div>
  );
}

export default function PhoneCollection({ variant }: PhoneCollectionProps) {
  const isOverview = variant === "overview";
  const limit = isOverview ? 4 : 12;
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [marcaSelecionada, setMarcaSelecionada] = useState("Todas as marcas");
  const [refreshKey, setRefreshKey] = useState(0);
  const requestKey = `${pagina}:${limit}:${refreshKey}`;
  const [requestResult, setRequestResult] = useState<
    | { key: string; status: "loading" }
    | { key: string; status: "success"; data: ListaCelulares }
    | { key: string; status: "error"; message: string }
  >({ key: "", status: "loading" });
  const currentResult =
    requestResult.key === requestKey ? requestResult : null;
  const loading =
    currentResult === null || currentResult.status === "loading";
  const erro =
    currentResult?.status === "error" ? currentResult.message : "";
  const celulares = useMemo(
    () =>
      currentResult?.status === "success"
        ? currentResult.data.celulares
        : [],
    [currentResult],
  );
  const paginacao =
    currentResult?.status === "success"
      ? currentResult.data.paginacao
      : null;

  useEffect(() => {
    const controller = new AbortController();

    listarCelulares(pagina, limit, controller.signal)
      .then((result) => {
        setRequestResult({ key: requestKey, status: "success", data: result });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRequestResult({
          key: requestKey,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o catálogo.",
        });
      });

    return () => controller.abort();
  }, [limit, pagina, refreshKey, requestKey]);

  const marcas = useMemo(
    () => [...new Set(celulares.map((celular) => celular.marca))].sort(),
    [celulares],
  );
  const celularesFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return celulares.filter((celular) => {
      const correspondeMarca =
        marcaSelecionada === "Todas as marcas" ||
        celular.marca === marcaSelecionada;
      const correspondeBusca =
        !termo ||
        `${celular.marca} ${celular.modelo} ${celular.descricao}`
          .toLocaleLowerCase("pt-BR")
          .includes(termo);

      return correspondeMarca && correspondeBusca;
    });
  }, [busca, celulares, marcaSelecionada]);

  function atualizarLista() {
    setRefreshKey((current) => current + 1);
  }

  if (isOverview) {
    return (
      <div className="page-shell overview-page">
        <section className="overview-hero">
          <div className="overview-hero__copy">
            <p className="eyebrow">FeedBackCELL · plataforma de celulares</p>
            <h1>Celulares para comparar. Opiniões para decidir.</h1>
            <p className="overview-hero__lead">
              Cadastre aparelhos e reúna informações e comentários sobre cada modelo.
            </p>
            <div className="button-row">
              <Link className="button button--accent" href="/items/new">
                <AppIcon name="plus" size={18} />
                Adicionar celular
              </Link>
              <Link className="button button--hero-secondary" href="/catalog">
                Ver catálogo
                <AppIcon name="arrow" size={17} />
              </Link>
            </div>
            {paginacao && (
              <p className="overview-hero__catalog-count">
                <strong>{paginacao.totalItems}</strong>{" "}
                {paginacao.totalItems === 1
                  ? "celular no catálogo"
                  : "celulares no catálogo"}
              </p>
            )}
          </div>
          <div className="overview-hero__visual" aria-hidden="true">
            <div className="overview-device">
              <span className="overview-device__camera" />
              <span className="overview-device__display">
                <span className="overview-device__topline" />
                <span className="overview-device__title" />
                <span className="overview-device__line" />
                <span className="overview-device__line overview-device__line--short" />
                <span className="overview-device__tile">
                  <AppIcon name="smartphone" size={28} />
                </span>
              </span>
            </div>
            <div className="overview-visual-note">
              <span className="overview-visual-note__mark">
                <AppIcon name="check" size={16} />
              </span>
              <span>Informações por modelo</span>
            </div>
          </div>
        </section>

        <section className="overview-catalog" aria-labelledby="latest-phones-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Catálogo de celulares</p>
              <h2 id="latest-phones-title">Últimos celulares cadastrados</h2>
            </div>
            {paginacao && (
              <p className="section-heading__meta">
                {paginacao.totalItems}{" "}
                {paginacao.totalItems === 1 ? "aparelho" : "aparelhos"} no catálogo
              </p>
            )}
          </div>

          {loading ? (
            <div className="collection-message" role="status">
              <span className="loading-indicator" />
              Carregando celulares…
            </div>
          ) : erro ? (
            <div className="collection-error" role="alert">
              <div>
                <h3>Não foi possível carregar os celulares</h3>
                <p>{erro}</p>
              </div>
              <button
                className="button button--secondary"
                type="button"
                onClick={atualizarLista}
              >
                <AppIcon name="refresh" size={17} />
                Tentar novamente
              </button>
            </div>
          ) : celulares.length === 0 ? (
            <EmptyState onRetry={atualizarLista} />
          ) : (
            <div className="phone-grid phone-grid--overview">
              {celulares.map((celular) => (
                <PhoneCard
                  key={celular.idcelular}
                  celular={celular}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell catalog-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Aparelhos e informações</p>
          <h1>Catálogo de celulares</h1>
          <p className="page-heading__description">
            Consulte modelos, preços e descrições cadastrados na plataforma.
          </p>
        </div>
        <Link className="button button--primary" href="/items/new">
          <AppIcon name="plus" size={18} />
          Adicionar celular
        </Link>
      </header>

      <div className="catalog-toolbar">
        <label className="search-field">
          <AppIcon name="search" size={19} />
          <span className="sr-only">Buscar celular</span>
          <input
            type="search"
            placeholder="Buscar marca, modelo ou descrição"
            value={busca}
            onChange={(event) => {
              setBusca(event.target.value);
              setPagina(1);
            }}
          />
        </label>
        {paginacao && (
          <p className="catalog-total">
            {paginacao.totalItems}{" "}
            {paginacao.totalItems === 1 ? "celular cadastrado" : "celulares cadastrados"}
          </p>
        )}
      </div>

      {marcas.length > 1 && !loading && !erro && (
        <div className="brand-filters" aria-label="Filtrar por marca">
          {["Todas as marcas", ...marcas].map((marca) => (
            <button
              key={marca}
              type="button"
              className={`filter-chip${marcaSelecionada === marca ? " is-active" : ""}`}
              aria-pressed={marcaSelecionada === marca}
              onClick={() => {
                setMarcaSelecionada(marca);
                setPagina(1);
              }}
            >
              {marca}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="collection-message" role="status">
          <span className="loading-indicator" />
          Carregando celulares…
        </div>
      ) : erro ? (
        <div className="collection-error" role="alert">
          <div>
            <h2>O catálogo não carregou</h2>
            <p>{erro}</p>
          </div>
          <button
            className="button button--secondary"
            type="button"
            onClick={atualizarLista}
          >
            <AppIcon name="refresh" size={17} />
            Tentar novamente
          </button>
        </div>
      ) : celularesFiltrados.length === 0 ? (
        celulares.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="collection-empty collection-empty--compact">
            <h2>Nenhum resultado para essa busca</h2>
            <p>Altere o texto ou a marca selecionada e tente novamente.</p>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setBusca("");
                setMarcaSelecionada("Todas as marcas");
              }}
            >
              Limpar filtros
            </button>
          </div>
        )
      ) : (
        <div className="phone-grid">
          {celularesFiltrados.map((celular) => (
            <PhoneCard key={celular.idcelular} celular={celular} />
          ))}
        </div>
      )}

      {paginacao && paginacao.totalPaginas > 1 && (
        <nav className="pagination" aria-label="Paginação do catálogo">
          <button
            className="button button--secondary pagination__button"
            type="button"
            disabled={pagina <= 1 || loading}
            onClick={() => setPagina((current) => Math.max(1, current - 1))}
          >
            <AppIcon name="chevron-left" size={18} />
            Anterior
          </button>
          <span>
            Página {paginacao.paginaAtual} de {paginacao.totalPaginas}
          </span>
          <button
            className="button button--secondary pagination__button"
            type="button"
            disabled={pagina >= paginacao.totalPaginas || loading}
            onClick={() =>
              setPagina((current) =>
                Math.min(paginacao.totalPaginas, current + 1),
              )
            }
          >
            Próxima
            <AppIcon name="chevron-right" size={18} />
          </button>
        </nav>
      )}
    </div>
  );
}
