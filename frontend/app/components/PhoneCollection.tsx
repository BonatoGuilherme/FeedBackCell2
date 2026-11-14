"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "./AppIcon";
import { PhoneShelf } from "@/components/ui/phone-shelf";
import { TiltCard } from "@/components/ui/tilt-card";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import {
  buscarCelular,
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

function PhoneCard({ celular }: { celular: Celular }) {
  const cover = celular.imagens[0]?.url;
  return (
    <TiltCard className="phone-card card group relative overflow-hidden rounded-[22px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
      <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(80%_80%_at_50%_0%,rgba(201,151,63,0.2),rgba(239,227,204,0.03)_70%)]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API
          <img
            src={cover}
            alt={`${celular.marca} ${celular.modelo}`}
            loading="lazy"
            className="foto-aparelho size-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="grid size-full place-items-center" aria-hidden="true">
            <span className="h-[78%] aspect-[1/2] rounded-[22%/11%] bg-[#3b2818] p-[4%] shadow-[0_20px_30px_-16px_rgba(15,16,32,0.6)] transition-transform duration-500 group-hover:-rotate-3">
              <span className="block size-full rounded-[18%/9%] bg-[linear-gradient(160deg,#e6c27a,#7a4a1c_60%,#120c06)]" />
            </span>
          </div>
        )}
        {celular.imagens.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {celular.imagens.length} fotos
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">{celular.marca}</p>
          <h3 className="truncate text-[16px] font-semibold text-foreground">{celular.modelo}</h3>
          <p className="mt-0.5 text-[14px] tabular-nums text-muted">
            {celular.preco > 0 ? currency.format(celular.preco) : "Preço não informado"}
          </p>
        </div>
        <Link
          className="relative z-[2] shrink-0 rounded-full bg-accent px-3.5 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          href={`/comments?celular=${celular.idcelular}`}
        >
          Comentários
        </Link>
      </div>
      {/* o card inteiro abre o celular no catálogo (o botão de comentários fica por cima) */}
      <Link
        href={`/catalog?celular=${celular.idcelular}`}
        aria-label={`Ver ${celular.marca} ${celular.modelo}`}
        className="absolute inset-0 z-[1] rounded-[22px] outline-none"
      />
    </TiltCard>
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
  const limit = isOverview ? 8 : 24;
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [marcaSelecionada, setMarcaSelecionada] = useState("Todas as marcas");
  const [refreshKey, setRefreshKey] = useState(0);
  // celular aberto no modal; /catalog?celular=ID abre direto (link da home)
  const [selecionado, setSelecionado] = useState<Celular | null>(null);
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

  useEffect(() => {
    if (isOverview) return;
    const id = new URLSearchParams(window.location.search).get("celular");
    if (!id || !/^[1-9]\d{0,9}$/.test(id)) return;
    const controller = new AbortController();
    buscarCelular(Number(id), controller.signal)
      .then(setSelecionado)
      .catch(() => {
        // celular inexistente ou removido: só mostra o catálogo
        if (!controller.signal.aborted) window.history.replaceState(null, "", "/catalog");
      });
    return () => controller.abort();
  }, [isOverview]);

  const abrirCelular = useCallback((celular: Celular) => {
    setSelecionado(celular);
    window.history.replaceState(null, "", `/catalog?celular=${celular.idcelular}`);
  }, []);

  const fecharCelular = useCallback(() => {
    setSelecionado(null);
    window.history.replaceState(null, "", "/catalog");
  }, []);

  function atualizarLista() {
    setRefreshKey((current) => current + 1);
  }

  if (isOverview) {
    return (
      <div className="page-shell overview-page">
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
            <Reveal className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" stagger={0.06}>
              {celulares.map((celular) => (
                <RevealItem key={celular.idcelular}>
                  <PhoneCard celular={celular} />
                </RevealItem>
              ))}
            </Reveal>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell catalog-page">
      <header className="page-heading">
        <div>
          <h1>Catálogo de celulares</h1>
          <p className="page-heading__description">
            {paginacao
              ? `${paginacao.totalItems} ${paginacao.totalItems === 1 ? "celular cadastrado" : "celulares cadastrados"} · `
              : ""}
            Toque em um aparelho para ver fotos e especificações.
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
        {/* filtros na mesma linha da busca; rolam para o lado se não couberem */}
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
      </div>

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
        <PhoneShelf
          className="mt-7"
          celulares={celularesFiltrados}
          formatPrice={(preco) => currency.format(preco)}
          aberto={selecionado}
          onAbrir={abrirCelular}
          onFechar={fecharCelular}
        />
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
