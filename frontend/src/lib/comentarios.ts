import { apiFetch, isRecord } from "./http";

export type Comentario = {
  idcomentario: number;
  idusuario: number;
  Nome: string;
  texto: string;
  dataCriacao: string;
};

export type ListaComentarios = {
  comentarios: Comentario[];
  paginacao: {
    paginaAtual: number;
    totalPaginas: number;
    totalItems: number;
    itemsPorPagina: number;
  };
};

function parseComentario(value: unknown): Comentario {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(Number(value.idcomentario)) ||
    !Number.isSafeInteger(Number(value.idusuario)) ||
    typeof value.texto !== "string"
  ) {
    throw new Error("A API retornou um comentário em formato inválido.");
  }

  return {
    idcomentario: Number(value.idcomentario),
    idusuario: Number(value.idusuario),
    Nome: typeof value.Nome === "string" ? value.Nome : "Usuário",
    texto: value.texto,
    dataCriacao:
      typeof value.dataCriacao === "string" ? value.dataCriacao : "",
  };
}

export async function listarComentarios(
  idcelular: number,
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<ListaComentarios> {
  const payload = await apiFetch(`/comentarios/${idcelular}?page=${page}&limit=${limit}`, { signal });

  if (!isRecord(payload) || !Array.isArray(payload.comentarios)) {
    throw new Error("A API retornou uma lista de comentários inválida.");
  }

  const pagination = payload.paginacao;
  if (
    !isRecord(pagination) ||
    !Number.isSafeInteger(pagination.paginaAtual) ||
    !Number.isSafeInteger(pagination.totalPaginas) ||
    !Number.isSafeInteger(pagination.totalItems) ||
    !Number.isSafeInteger(pagination.itemsPorPagina)
  ) {
    throw new Error("A API retornou paginação de comentários inválida.");
  }

  return {
    comentarios: payload.comentarios.map(parseComentario),
    paginacao: {
      paginaAtual: Number(pagination.paginaAtual),
      totalPaginas: Number(pagination.totalPaginas),
      totalItems: Number(pagination.totalItems),
      itemsPorPagina: Number(pagination.itemsPorPagina),
    },
  };
}

export async function criarComentario(
  idcelular: number,
  texto: string,
  token: string,
): Promise<void> {
  await apiFetch(`/comentarios/${idcelular}`, { method: "POST", token, body: { texto } });
}

export async function excluirComentario(
  idcelular: number,
  idcomentario: number,
  token: string,
): Promise<void> {
  await apiFetch(`/comentarios/${idcelular}/${idcomentario}`, { method: "DELETE", token });
}
