"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
} from "lucide-react";
import { buscarCelular, type Celular } from "@/src/lib/celulares";
import {
  criarComentario,
  excluirComentario,
  listarComentarios,
  type ListaComentarios,
} from "@/src/lib/comentarios";
import { getSessionUserId, getToken } from "@/src/lib/session";

const PAGE_SIZE = 20;
const MIN_CHARS = 3;
const MAX_CHARS = 500;

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const letras = (partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "");
  return letras.toUpperCase() || "?";
}

function formatarData(iso: string) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : formatoData.format(data);
}

/** Cabeçalho com o celular em contexto: foto, marca, modelo e preço. */
function CelularHeader({
  id,
  celular,
  total,
}: {
  id: number;
  celular: Celular | null;
  total: number | null;
}) {
  const foto = celular?.imagens[0]?.url;
  const nome = celular ? `${celular.marca} ${celular.modelo}` : `Celular #${id}`;

  return (
    <header className="comments-hero">
      <div className="comments-hero__media">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem servida pela API
          <img src={foto} alt={nome} className="foto-aparelho" />
        ) : (
          <Smartphone size={28} strokeWidth={1.5} aria-hidden="true" />
        )}
      </div>
      <div className="comments-hero__info">
        <p className="eyebrow">{celular ? celular.marca : "Comentários"}</p>
        <h1>{celular ? celular.modelo : nome}</h1>
        <p className="comments-hero__meta">
          {celular && celular.preco > 0 && <span>{currency.format(celular.preco)}</span>}
          {total !== null && (
            <span>
              {total} {total === 1 ? "comentário" : "comentários"}
            </span>
          )}
        </p>
      </div>
      <Link
        className="button button--secondary comments-hero__action"
        href={`/catalog?celular=${id}`}
      >
        Ver ficha completa
      </Link>
    </header>
  );
}

function ListaCarregando() {
  return (
    <div className="comment-list" role="status" aria-label="Carregando comentários">
      {[0, 1, 2].map((item) => (
        <div className="comment-item comment-item--skeleton" key={item} aria-hidden="true">
          <span className="skeleton skeleton--avatar" />
          <div className="comment-item__body">
            <span className="skeleton skeleton--line" style={{ width: "32%" }} />
            <span className="skeleton skeleton--line" style={{ width: "92%" }} />
            <span className="skeleton skeleton--line" style={{ width: "64%" }} />
          </div>
        </div>
      ))}
      <span className="sr-only">Carregando comentários…</span>
    </div>
  );
}

export default function CommentsPage() {
  const [celularId, setCelularId] = useState("");
  const [celularCarregado, setCelularCarregado] = useState<number | null>(null);
  const [celular, setCelular] = useState<Celular | null>(null);
  const [pagina, setPagina] = useState(1);
  const [atualizacao, setAtualizacao] = useState(0);
  const [lista, setLista] = useState<ListaComentarios | null>(null);
  const [texto, setTexto] = useState("");
  const [textoTocado, setTextoTocado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const usuarioId = getSessionUserId();

  useEffect(() => {
    const initialId = new URLSearchParams(window.location.search).get("celular");
    if (initialId && /^[1-9]\d*$/.test(initialId)) {
      setCelularId(initialId);
      setCelularCarregado(Number(initialId));
    }
  }, []);

  // dados do celular só para o cabeçalho; se falhar, o cabeçalho mostra o ID
  useEffect(() => {
    setCelular(null);
    if (celularCarregado === null) return;
    const controller = new AbortController();
    buscarCelular(celularCarregado, controller.signal)
      .then(setCelular)
      .catch(() => {
        // sem foto e nome: o cabeçalho usa "Celular #ID"
      });
    return () => controller.abort();
  }, [celularCarregado]);

  useEffect(() => {
    if (celularCarregado === null) {
      setLista(null);
      return;
    }

    const controller = new AbortController();
    setCarregando(true);
    setErro("");

    listarComentarios(celularCarregado, pagina, PAGE_SIZE, controller.signal)
      .then(setLista)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setErro(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar os comentários.",
        );
        setLista(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, [atualizacao, celularCarregado, pagina]);

  function buscarComentarios(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Number(celularId);
    if (!Number.isSafeInteger(id) || id < 1) {
      setErro("Informe um ID de celular válido.");
      return;
    }

    setErro("");
    setPagina(1);
    setLista(null);
    setCelularCarregado(id);
    setAtualizacao((value) => value + 1);
    window.history.replaceState(null, "", `/comments?celular=${id}`);
  }

  async function enviarComentario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token || celularCarregado === null) {
      setErro("Sua sessão expirou. Entre novamente para comentar.");
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      await criarComentario(celularCarregado, texto, token);
      setTexto("");
      setTextoTocado(false);
      setPagina(1);
      setAtualizacao((value) => value + 1);
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : "Não foi possível publicar o comentário.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function removerComentario(idcomentario: number) {
    const token = getToken();
    if (!token || celularCarregado === null) {
      setErro("Sua sessão expirou. Entre novamente para continuar.");
      return;
    }

    setErro("");
    try {
      await excluirComentario(celularCarregado, idcomentario, token);
      setAtualizacao((value) => value + 1);
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : "Não foi possível excluir o comentário.",
      );
    }
  }

  const caracteres = texto.length;
  const textoCurto = texto.trim().length < MIN_CHARS;
  const mostrarErroTexto = textoTocado && caracteres > 0 && textoCurto;
  const pertoDoLimite = caracteres >= MAX_CHARS - 50;

  const buscaPorId = (
    <form className="comments-lookup" onSubmit={buscarComentarios}>
      <label htmlFor="celular-id">
        {celularCarregado === null ? "ID do celular" : "Trocar de celular"}
      </label>
      <div className="comments-lookup__row">
        <div className="search-field">
          <Search size={17} strokeWidth={1.8} aria-hidden="true" />
          <input
            id="celular-id"
            inputMode="numeric"
            min="1"
            onChange={(event) => setCelularId(event.target.value)}
            placeholder="Ex.: 12"
            required
            type="number"
            value={celularId}
          />
        </div>
        <button className="button button--secondary" type="submit">
          Abrir
        </button>
      </div>
    </form>
  );

  return (
    <div className="page-shell comments-page">
      <Link className="back-link" href="/catalog">
        <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" />
        Catálogo
      </Link>

      {celularCarregado === null ? (
        <section className="comments-start" aria-labelledby="comments-start-title">
          <span className="comments-start__icon">
            <MessageSquare size={22} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <h1 id="comments-start-title">Comentários por celular</h1>
          <p>
            Abra os comentários de um aparelho pelo catálogo ou informe o ID dele abaixo.
          </p>
          {erro && (
            <p className="form-alert" role="alert">
              {erro}
            </p>
          )}
          {buscaPorId}
        </section>
      ) : (
        <>
          <CelularHeader
            id={celularCarregado}
            celular={celular}
            total={lista ? lista.paginacao.totalItems : null}
          />

          <div className="comments-layout">
            <section className="comments-main" aria-labelledby="comments-title">
              <h2 id="comments-title" className="sr-only">
                Comentários
              </h2>

              <form className="form-field comment-composer"onSubmit={enviarComentario}>
                <label htmlFor="comment-text">Escreva um comentário</label>
                <textarea
                  aria-describedby="comment-text-hint"
                  aria-invalid={mostrarErroTexto}
                  id="comment-text"
                  maxLength={MAX_CHARS}
                  minLength={MIN_CHARS}
                  onBlur={() => setTextoTocado(true)}
                  onChange={(event) => setTexto(event.target.value)}
                  placeholder="O que você achou deste celular? Conte sobre bateria, câmera, desempenho…"
                  required
                  rows={4}
                  value={texto}
                />
                <div className="comment-composer__footer">
                  <p
                    id="comment-text-hint"
                    className={`comment-composer__hint${mostrarErroTexto ? " is-error" : ""}`}
                  >
                    {mostrarErroTexto
                      ? `Escreva pelo menos ${MIN_CHARS} caracteres.`
                      : `Entre ${MIN_CHARS} e ${MAX_CHARS} caracteres.`}
                  </p>
                  <span
                    className={`comment-composer__count${pertoDoLimite ? " is-warning" : ""}`}
                    aria-live="polite"
                  >
                    {caracteres}/{MAX_CHARS}
                  </span>
                  <button
                    className="button button--primary"
                    disabled={enviando || textoCurto}
                    type="submit"
                  >
                    {enviando && <span className="button-spinner" aria-hidden="true" />}
                    {enviando ? "Publicando…" : "Publicar"}
                  </button>
                </div>
              </form>

              {erro && (
                <div className="comments-alert" role="alert">
                  <AlertCircle size={18} strokeWidth={1.8} aria-hidden="true" />
                  <p>{erro}</p>
                  {!lista && !carregando && (
                    <button
                      className="button button--secondary button--sm"
                      onClick={() => setAtualizacao((value) => value + 1)}
                      type="button"
                    >
                      <RefreshCw size={14} strokeWidth={1.8} aria-hidden="true" />
                      Tentar novamente
                    </button>
                  )}
                </div>
              )}

              {carregando ? (
                <ListaCarregando />
              ) : lista && lista.comentarios.length > 0 ? (
                <ol className="comment-list">
                  {lista.comentarios.map((comentario) => (
                    <li className="comment-item" key={comentario.idcomentario}>
                      <span className="comment-item__avatar" aria-hidden="true">
                        {iniciais(comentario.Nome)}
                      </span>
                      <article className="comment-item__body">
                        <header className="comment-item__header">
                          <strong>{comentario.Nome}</strong>
                          {comentario.dataCriacao && (
                            <time dateTime={comentario.dataCriacao}>
                              {formatarData(comentario.dataCriacao)}
                            </time>
                          )}
                          {comentario.idusuario === usuarioId && (
                            <button
                              aria-label="Excluir meu comentário"
                              className="comment-item__delete"
                              onClick={() => void removerComentario(comentario.idcomentario)}
                              title="Excluir meu comentário"
                              type="button"
                            >
                              <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
                            </button>
                          )}
                        </header>
                        <p>{comentario.texto}</p>
                      </article>
                    </li>
                  ))}
                </ol>
              ) : (
                !erro && (
                  <div className="comments-empty">
                    <span className="comments-empty__icon">
                      <MessageSquare size={20} strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <h3>Nenhum comentário ainda</h3>
                    <p>Seja a primeira pessoa a contar o que achou deste celular.</p>
                  </div>
                )
              )}

              {lista && lista.paginacao.totalPaginas > 1 && (
                <nav className="pagination" aria-label="Paginação dos comentários">
                  <button
                    className="button button--secondary pagination__button"
                    disabled={pagina <= 1 || carregando}
                    onClick={() => setPagina((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
                    Anterior
                  </button>
                  <span>
                    Página {lista.paginacao.paginaAtual} de {lista.paginacao.totalPaginas}
                  </span>
                  <button
                    className="button button--secondary pagination__button"
                    disabled={pagina >= lista.paginacao.totalPaginas || carregando}
                    onClick={() => setPagina((current) => current + 1)}
                    type="button"
                  >
                    Próxima
                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </section>

            <aside className="comments-aside">
              <div className="comments-aside__card">
                <h2>Boas práticas</h2>
                <ul>
                  <li>Conte há quanto tempo usa o aparelho.</li>
                  <li>Fale de bateria, câmera e desempenho no dia a dia.</li>
                  <li>Seja respeitoso com quem pensa diferente.</li>
                </ul>
              </div>
              <div className="comments-aside__card">{buscaPorId}</div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
