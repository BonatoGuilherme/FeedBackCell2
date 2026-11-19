"use client";

/**
 * Avaliações de um celular, dentro da página dele: nota de 1 a 5 + comentário,
 * lista paginada e exclusão dos próprios comentários.
 * `onAlterado` avisa a página para recarregar a média do aparelho.
 */

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, MessageSquare, RefreshCw, Trash2 } from "lucide-react";
import {
  criarComentario,
  excluirComentario,
  listarComentarios,
  type ListaComentarios,
} from "@/src/lib/comentarios";
import { getSessionUserId, getToken } from "@/src/lib/session";
import { Estrelas, NotaCampo } from "@/components/ui/rating";

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

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const letras = (partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "");
  return letras.toUpperCase() || "?";
}

function formatarData(iso: string) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : formatoData.format(data);
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

export default function PhoneComments({
  idcelular,
  onAlterado,
}: {
  idcelular: number;
  onAlterado: () => void;
}) {
  const [pagina, setPagina] = useState(1);
  const [atualizacao, setAtualizacao] = useState(0);
  const [lista, setLista] = useState<ListaComentarios | null>(null);
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState(0);
  const [tentou, setTentou] = useState(false);
  const [textoTocado, setTextoTocado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const usuarioId = getSessionUserId();

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro("");

    listarComentarios(idcelular, pagina, PAGE_SIZE, controller.signal)
      .then(setLista)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setErro(cause instanceof Error ? cause.message : "Não foi possível carregar os comentários.");
        setLista(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, [atualizacao, idcelular, pagina]);

  const caracteres = texto.length;
  const textoCurto = texto.trim().length < MIN_CHARS;
  const mostrarErroTexto = (textoTocado || tentou) && textoCurto;
  const erroNota = tentou && !nota ? "Escolha uma nota de 1 a 5 estrelas." : "";
  const pertoDoLimite = caracteres >= MAX_CHARS - 50;

  async function enviarComentario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTentou(true);
    if (!nota || textoCurto) return;
    const token = getToken();
    if (!token) {
      setErro("Sua sessão expirou. Entre novamente para comentar.");
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      await criarComentario(idcelular, texto, nota, token);
      setTexto("");
      setNota(0);
      setTentou(false);
      setTextoTocado(false);
      setPagina(1);
      setAtualizacao((value) => value + 1);
      onAlterado();
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível publicar o comentário.");
    } finally {
      setEnviando(false);
    }
  }

  async function removerComentario(idcomentario: number) {
    const token = getToken();
    if (!token) {
      setErro("Sua sessão expirou. Entre novamente para continuar.");
      return;
    }

    setErro("");
    try {
      await excluirComentario(idcelular, idcomentario, token);
      setAtualizacao((value) => value + 1);
      onAlterado();
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível excluir o comentário.");
    }
  }

  const total = lista?.paginacao.totalItems ?? null;

  return (
    <section id="comentarios" className="phone-reviews" aria-labelledby="comments-title">
      <header className="phone-reviews__header">
        <h2 id="comments-title">Avaliações</h2>
        {total !== null && (
          <span className="phone-reviews__count">
            {total} {total === 1 ? "comentário" : "comentários"}
          </span>
        )}
      </header>

      <form className="form-field comment-composer" onSubmit={enviarComentario} noValidate>
        <NotaCampo valor={nota} onChange={setNota} erro={erroNota} disabled={enviando} />
        <label htmlFor="comment-text">Seu comentário</label>
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
          <p id="comment-text-hint" className={`comment-composer__hint${mostrarErroTexto ? " is-error" : ""}`}>
            {mostrarErroTexto
              ? `Escreva pelo menos ${MIN_CHARS} caracteres.`
              : `Entre ${MIN_CHARS} e ${MAX_CHARS} caracteres.`}
          </p>
          <span className={`comment-composer__count${pertoDoLimite ? " is-warning" : ""}`} aria-live="polite">
            {caracteres}/{MAX_CHARS}
          </span>
          <button className="button button--primary" disabled={enviando} type="submit">
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
                    <time dateTime={comentario.dataCriacao}>{formatarData(comentario.dataCriacao)}</time>
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
                {comentario.nota !== null && (
                  <p className="comment-item__rating">
                    <Estrelas valor={comentario.nota} />
                    <span className="sr-only">Nota {comentario.nota} de 5</span>
                  </p>
                )}
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
            <h3>Nenhuma avaliação ainda</h3>
            <p>Seja a primeira pessoa a dar nota e contar o que achou deste celular.</p>
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
  );
}
