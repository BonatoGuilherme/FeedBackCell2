"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  criarComentario,
  excluirComentario,
  listarComentarios,
  type ListaComentarios,
} from "@/src/lib/comentarios";
import { getSessionUserId } from "@/src/lib/session";

const PAGE_SIZE = 20;

export default function CommentsPage() {
  const [celularId, setCelularId] = useState("");
  const [celularCarregado, setCelularCarregado] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [atualizacao, setAtualizacao] = useState(0);
  const [lista, setLista] = useState<ListaComentarios | null>(null);
  const [texto, setTexto] = useState("");
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
    const token = window.localStorage.getItem("token");
    if (!token || celularCarregado === null) {
      setErro("Sua sessão expirou. Entre novamente para comentar.");
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      await criarComentario(celularCarregado, texto, token);
      setTexto("");
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
    const token = window.localStorage.getItem("token");
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

  return (
    <div className="page-shell comments-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Opiniões da comunidade</p>
          <h1>Comentários por celular</h1>
          <p className="page-heading__description">
            Abra os comentários de um aparelho pelo catálogo ou informe seu ID.
          </p>
        </div>
        <Link className="button button--secondary" href="/catalog">
          Voltar ao catálogo
        </Link>
      </header>

      <form className="comment-form" onSubmit={buscarComentarios}>
        <label htmlFor="celular-id">ID do celular</label>
        <div className="comment-form__row">
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
          <button className="button button--primary" type="submit">
            Buscar comentários
          </button>
        </div>
      </form>

      {celularCarregado !== null && (
        <section className="comments-section" aria-labelledby="comments-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Celular #{celularCarregado}</p>
              <h2 id="comments-title">Comentários</h2>
            </div>
            {lista && (
              <p className="section-heading__meta">
                {lista.paginacao.totalItems}{" "}
                {lista.paginacao.totalItems === 1 ? "comentário" : "comentários"}
              </p>
            )}
          </div>

          <form className="comment-form" onSubmit={enviarComentario}>
            <label htmlFor="comment-text">Adicionar comentário</label>
            <textarea
              id="comment-text"
              maxLength={500}
              minLength={3}
              onChange={(event) => setTexto(event.target.value)}
              placeholder="Compartilhe sua opinião sobre este celular"
              required
              rows={4}
              value={texto}
            />
            <div className="comment-form__footer">
              <span>{texto.length}/500 caracteres</span>
              <button
                className="button button--primary"
                disabled={enviando}
                type="submit"
              >
                {enviando ? "Publicando…" : "Publicar comentário"}
              </button>
            </div>
          </form>

          {erro && <p className="collection-error" role="alert">{erro}</p>}
          {carregando ? (
            <p className="collection-message" role="status">
              Carregando comentários…
            </p>
          ) : lista && lista.comentarios.length > 0 ? (
            <div className="comment-list">
              {lista.comentarios.map((comentario) => (
                <article className="comment-card" key={comentario.idcomentario}>
                  <div className="comment-card__header">
                    <strong>{comentario.Nome}</strong>
                    {comentario.dataCriacao && (
                      <time dateTime={comentario.dataCriacao}>
                        {new Date(comentario.dataCriacao).toLocaleString("pt-BR")}
                      </time>
                    )}
                  </div>
                  <p>{comentario.texto}</p>
                  {comentario.idusuario === usuarioId && (
                    <button
                      className="button button--text"
                      onClick={() => void removerComentario(comentario.idcomentario)}
                      type="button"
                    >
                      Excluir meu comentário
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            !carregando &&
            !erro && (
              <div className="collection-empty collection-empty--compact">
                <h2>Nenhum comentário ainda</h2>
                <p>Seja a primeira pessoa a comentar sobre este celular.</p>
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
                Anterior
              </button>
              <span>
                Página {lista.paginacao.paginaAtual} de{" "}
                {lista.paginacao.totalPaginas}
              </span>
              <button
                className="button button--secondary pagination__button"
                disabled={pagina >= lista.paginacao.totalPaginas || carregando}
                onClick={() => setPagina((current) => current + 1)}
                type="button"
              >
                Próxima
              </button>
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
