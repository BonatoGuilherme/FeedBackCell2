"use client";

/**
 * Página de um celular (/catalog/ID): no topo, o carrossel orbital com os
 * aparelhos do catálogo; embaixo, as especificações completas, a faixa com
 * outros aparelhos da marca e as avaliações da comunidade.
 *
 * Quem manda é a URL. Trocar de celular (setas, miniaturas, teclado, deslizar)
 * só faz `history.pushState`: a página não é montada de novo, então o carrossel
 * anima a troca, e voltar/avançar no navegador também anima.
 *
 * A parte de baixo nunca fica vazia na troca: a ficha do celular anterior
 * continua na tela até o novo (com a primeira página de comentários) chegar, e
 * aí as duas trocam com um esmaecer cruzado curto.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, RefreshCw, SearchX } from "lucide-react";
import { buscarCelular, type Celular } from "@/src/lib/celulares";
import { listarComentarios, type ListaComentarios } from "@/src/lib/comentarios";
import { ApiError } from "@/src/lib/http";
import { MOLDURA_APARELHO } from "@/components/ui/phone-photo";
import { CelularTransicao } from "@/components/ui/transicoes";
import { PhoneCarousel, type Direcao } from "@/components/ui/phone-carousel";
import { PhoneMiniCard, ROTULOS_ESPECIFICACOES } from "@/components/ui/phone-shelf";
import { PrecoLancamento } from "@/components/ui/preco-lancamento";
import { useOrdemCelulares, useTeclasDeTroca } from "./PhoneNavigation";
import PhoneComments, { COMENTARIOS_POR_PAGINA } from "./PhoneComments";

/** Um celular pronto para a ficha: os dados e a primeira página de comentários (se vieram). */
type Carregado = { celular: Celular; comentarios?: ListaComentarios };

type Estado =
  | { status: "loading"; id: number | null }
  | ({ status: "ok"; id: number } & Carregado)
  | { status: "not-found"; id: number }
  | { status: "error"; id: number; message: string };

/** Só ids inteiros positivos; o resto vira "celular não encontrado". */
function idDaUrl(pathname: string | null): number | null {
  const trecho = pathname?.split("/")[2] ?? "";
  return /^[1-9]\d{0,9}$/.test(trecho) ? Number(trecho) : null;
}

/** Campos que já aparecem no cartão do carrossel (aba "Ficha técnica"). */
const NO_CARTAO = new Set(["tela", "hardware", "camera", "bateria"]);

const SUAVE = [0.25, 0.46, 0.45, 0.94] as const;

export default function PhoneDetail() {
  const idcelular = idDaUrl(usePathname());
  const ordem = useOrdemCelulares();
  const reduzir = useReducedMotion() ?? false;
  const [estado, setEstado] = useState<Estado>({ status: "loading", id: idcelular });
  // o último celular que carregou: segura a parte de baixo enquanto o próximo chega
  const [ficha, setFicha] = useState<Carregado | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (idcelular === null) return;
    const controller = new AbortController();
    Promise.all([
      buscarCelular(idcelular, controller.signal),
      // sem a primeira página, a lista de comentários carrega sozinha depois
      listarComentarios(idcelular, 1, COMENTARIOS_POR_PAGINA, controller.signal).catch(() => undefined),
    ])
      .then(([celular, comentarios]) => {
        if (controller.signal.aborted) return;
        setEstado({ status: "ok", id: idcelular, celular, comentarios });
        setFicha({ celular, comentarios });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 404) {
          setEstado({ status: "not-found", id: idcelular });
          return;
        }
        // numa recarga (depois de comentar) mantém o que já está na tela
        setEstado((atual) =>
          atual.status === "ok" && atual.id === idcelular
            ? atual
            : {
                status: "error",
                id: idcelular,
                message: error instanceof Error ? error.message : "Não foi possível carregar o celular.",
              },
        );
      });
    return () => controller.abort();
  }, [idcelular, recarga]);

  // depois de comentar ou excluir, busca de novo para atualizar a média
  const recarregar = useCallback(() => setRecarga((n) => n + 1), []);

  const detalhe = estado.status === "ok" && estado.id === idcelular ? estado.celular : null;

  // o carrossel usa a ordem do catálogo; se o celular não estiver nela, mostra só ele
  const naOrdem = ordem?.some((c) => c.idcelular === idcelular) ?? false;
  const base = naOrdem && ordem ? ordem : detalhe ? [detalhe] : null;
  // o detalhe é mais novo que a lista (ex.: a média depois de comentar)
  const itens = base && detalhe ? base.map((c) => (c.idcelular === detalhe.idcelular ? detalhe : c)) : base;
  const indice = itens ? itens.findIndex((c) => c.idcelular === idcelular) : -1;
  const atual = indice >= 0 && itens ? itens[indice] : null;

  // direção da troca: sai do índice anterior (vale para setas e para o voltar do navegador)
  const [visto, setVisto] = useState<{ indice: number; direcao: Direcao }>({ indice, direcao: 1 });
  if (indice !== visto.indice) setVisto({ indice, direcao: indice > visto.indice ? 1 : -1 });

  const ir = useCallback(
    (para: number) => {
      const destino = itens?.[para];
      if (destino) window.history.pushState(null, "", `/catalog/${destino.idcelular}`);
    },
    [itens],
  );
  const irAnterior = useCallback(() => ir(indice - 1), [ir, indice]);
  const irProximo = useCallback(() => ir(indice + 1), [ir, indice]);
  const temAnterior = atual !== null && indice > 0;
  const temProximo = atual !== null && itens !== null && indice < itens.length - 1;
  useTeclasDeTroca(temAnterior ? irAnterior : null, temProximo ? irProximo : null);

  useEffect(() => {
    if (atual) document.title = `${atual.marca} ${atual.modelo} · FeedBackCELL`;
  }, [atual]);

  const naoEncontrado = idcelular === null || (estado.status === "not-found" && estado.id === idcelular);
  const erro = estado.status === "error" && estado.id === idcelular ? estado.message : null;

  return (
    <div className="page-shell phone-page">
      <div className="phone-page__top">
        <Link className="back-link" href="/catalog">
          <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" />
          Catálogo
        </Link>
      </div>

      {naoEncontrado ? (
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
      ) : atual && itens ? (
        <div className="phone-panel">
          <PhoneCarousel celulares={itens} indice={indice} direcao={visto.direcao} onIr={ir} />
          {erro ? (
            <ErroCelular message={erro} onTentar={recarregar} />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {ficha ? (
                <motion.div
                  key={ficha.celular.idcelular}
                  className="phone-ficha"
                  initial={{ opacity: 0, y: reduzir ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: reduzir ? 0 : 0.28, ease: SUAVE } }}
                  exit={{ opacity: 0, transition: { duration: reduzir ? 0 : 0.16 } }}
                >
                  <Ficha
                    celular={ficha.celular}
                    comentarios={ficha.comentarios}
                    catalogo={ordem}
                    onAlterado={recarregar}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="carregando"
                  className="phone-detail__info"
                  role="status"
                  aria-label="Carregando especificações"
                  exit={{ opacity: 0, transition: { duration: reduzir ? 0 : 0.16 } }}
                >
                  <span className="skeleton skeleton--block" />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      ) : erro ? (
        <ErroCelular message={erro} onTentar={recarregar} />
      ) : (
        <FichaCarregando idcelular={idcelular} />
      )}
    </div>
  );
}

function ErroCelular({ message, onTentar }: { message: string; onTentar: () => void }) {
  return (
    <div className="collection-error" role="alert">
      <div>
        <h1>O celular não carregou</h1>
        <p>{message}</p>
      </div>
      <button className="button button--secondary" type="button" onClick={onTentar}>
        <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  );
}

/**
 * Esqueleto enquanto o celular carrega (só quando não há nem a ordem do catálogo
 * guardada). A moldura já existe na primeira renderização com o nome de
 * transição do aparelho: é o destino da foto que "voa" da prateleira.
 */
function FichaCarregando({ idcelular }: { idcelular: number }) {
  return (
    <div className="phone-panel" role="status" aria-label="Carregando celular">
      <div className="phone-detail">
        <div className="phone-detail__media phone-detail__media--loading">
          <CelularTransicao id={idcelular}>
            <div className={`${MOLDURA_APARELHO} skeleton`} />
          </CelularTransicao>
        </div>
        <div className="phone-detail__info" aria-hidden="true">
          <span className="skeleton skeleton--line" style={{ width: "22%" }} />
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--line" style={{ width: "40%" }} />
          <span className="skeleton skeleton--block" />
        </div>
      </div>
      <span className="sr-only">Carregando celular…</span>
    </div>
  );
}

const MIN_DA_MARCA = 3;

/**
 * Faixa com outros aparelhos: os da mesma marca quando há pelo menos
 * MIN_DA_MARCA deles; senão, outros celulares do catálogo. Usa a lista que o
 * carrossel já tem, então entra junto com a ficha (sem aparecer depois).
 */
function MaisAparelhos({ celular, catalogo }: { celular: Celular; catalogo: Celular[] | null }) {
  if (!catalogo) return null;
  const outros = catalogo.filter((c) => c.idcelular !== celular.idcelular);
  const daMarca = outros.filter((c) => c.marca.toLowerCase() === celular.marca.toLowerCase());
  const [titulo, lista] =
    daMarca.length >= MIN_DA_MARCA ? [`Mais da ${celular.marca}`, daMarca] : ["Outros celulares", outros];
  if (lista.length === 0) return null;

  return (
    <section className="phone-related" aria-labelledby="mais-aparelhos">
      <h2 id="mais-aparelhos">{titulo}</h2>
      <ul className="phone-related__list">
        {lista.slice(0, 6).map((outro) => (
          <li key={outro.idcelular}>
            <PhoneMiniCard celular={outro} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** O que fica abaixo do carrossel: especificações completas, outros aparelhos e avaliações. */
function Ficha({
  celular,
  comentarios,
  catalogo,
  onAlterado,
}: {
  celular: Celular;
  comentarios?: ListaComentarios;
  catalogo: Celular[] | null;
  onAlterado: () => void;
}) {
  const { especificacoes } = celular;
  const specs = especificacoes
    ? ROTULOS_ESPECIFICACOES.filter(([campo]) => especificacoes[campo] && !NO_CARTAO.has(campo))
    : [];

  return (
    <>
      {(specs.length > 0 || celular.dataCriacao) && (
        <section className="phone-detail__info phone-detail__more" aria-label="Especificações">
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
        </section>
      )}

      <MaisAparelhos celular={celular} catalogo={catalogo} />

      <PhoneComments
        idcelular={celular.idcelular}
        notaMedia={celular.notaMedia}
        avaliacoes={celular.avaliacoes}
        inicial={comentarios}
        onAlterado={onAlterado}
      />
    </>
  );
}
