"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useHasSession } from "@/src/lib/useSession";
import { hrefProtegido } from "@/src/lib/rotas";
import AppIcon from "./AppIcon";
import CatalogSearch from "./CatalogSearch";
import { lembrarOrdemCelulares, prepararOrdemCelulares } from "./PhoneNavigation";
import { PhoneShelf } from "@/components/ui/phone-shelf";
import { TiltCard } from "@/components/ui/tilt-card";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { NotaResumo } from "@/components/ui/rating";
import {
  listarCelulares,
  type Celular,
  type ListaCelulares,
} from "@/src/lib/celulares";

type PhoneCollectionProps = {
  variant: "overview" | "catalog";
};

/**
 * Última lista carregada de cada página, guardada enquanto a aba estiver aberta.
 * Ao voltar da página de um celular a prateleira já nasce preenchida: sem isso a
 * foto não teria par e a transição compartilhada não aconteceria na volta. Os
 * dados são revalidados no efeito logo em seguida.
 */
const cacheListas = new Map<string, ListaCelulares>();

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
          <NotaResumo
            compacto
            notaMedia={celular.notaMedia}
            avaliacoes={celular.avaliacoes}
            className="mt-0.5 text-[14px]"
          />
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-[13px] font-semibold text-on-accent transition-colors group-hover:bg-accent-hover"
        >
          Ver avaliações
        </span>
      </div>
      {/* o card inteiro abre a página do celular */}
      <Link
        href={`/catalogo/${celular.idcelular}`}
        aria-label={`Ver ${celular.marca} ${celular.modelo}`}
        className="absolute inset-0 z-[1] rounded-[22px] outline-none"
      />
    </TiltCard>
  );
}

function EmptyState({ onRetry }: { onRetry?: () => void }) {
  const logado = useHasSession();
  return (
    <div className="collection-empty">
      <span className="collection-empty__icon">
        <AppIcon name="smartphone" size={25} />
      </span>
      <h3>Nenhum celular no catálogo</h3>
      <p>Cadastre o primeiro aparelho para começar a organizar as informações.</p>
      <Link className="button button--primary" href={hrefProtegido("/items/new", logado)}>
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
  const logado = useHasSession();
  const isOverview = variant === "overview";
  const limit = isOverview ? 8 : 24;
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [marcaSelecionada, setMarcaSelecionada] = useState("Todas as marcas");
  const [refreshKey, setRefreshKey] = useState(0);
  const requestKey = `${pagina}:${limit}:${refreshKey}`;
  const [requestResult, setRequestResult] = useState<
    | { key: string; status: "loading" }
    | { key: string; status: "success"; data: ListaCelulares }
    | { key: string; status: "error"; message: string }
  >(() => {
    const emCache = cacheListas.get(requestKey);
    return emCache
      ? { key: requestKey, status: "success" as const, data: emCache }
      : { key: "", status: "loading" as const };
  });
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
        cacheListas.set(requestKey, result);
        // a primeira página já serve de ordem para o carrossel da página do celular
        if (pagina === 1 && !isOverview) lembrarOrdemCelulares(result.celulares, true);
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
  }, [isOverview, limit, pagina, refreshKey, requestKey]);

  // a ordem completa fica pronta para a página do celular (vale também para a Home)
  useEffect(() => {
    prepararOrdemCelulares();
  }, []);

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
        `${celular.marca} ${celular.modelo}`
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
            Toque em um aparelho para ver fotos, especificações e avaliações.
          </p>
        </div>
        <Link className="button button--primary" href={hrefProtegido("/items/new", logado)}>
          <AppIcon name="plus" size={18} />
          Adicionar celular
        </Link>
      </header>

      <div className="catalog-toolbar">
        <CatalogSearch
          valor={busca}
          onChange={(texto) => {
            setBusca(texto);
            setPagina(1);
          }}
        />
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
