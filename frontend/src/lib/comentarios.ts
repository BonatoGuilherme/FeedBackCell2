const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readResponse(response: Response): Promise<unknown> {
  const body = await response.text();
  let payload: unknown = null;

  if (body) {
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      if (response.ok) {
        throw new Error("A API retornou uma resposta inválida.");
      }
    }
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.erro === "string"
        ? payload.erro
        : `Não foi possível concluir a solicitação (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return payload;
}

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
  const response = await fetch(
    `${API_BASE_URL}/comentarios/${idcelular}?page=${page}&limit=${limit}`,
    { headers: { Accept: "application/json" }, signal },
  );
  const payload = await readResponse(response);

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
  const response = await fetch(`${API_BASE_URL}/comentarios/${idcelular}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ texto }),
  });
  await readResponse(response);
}

export async function excluirComentario(
  idcelular: number,
  idcomentario: number,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/comentarios/${idcelular}/${idcomentario}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  await readResponse(response);
}
