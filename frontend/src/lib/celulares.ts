const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type Celular = {
  idcelular: number;
  marca: string;
  modelo: string;
  preco: number;
  descricao: string;
  dataCriacao?: string | null;
};

export type Paginacao = {
  paginaAtual: number;
  totalPaginas: number;
  totalItems: number;
  itemsPorPagina: number;
};

export type ListaCelulares = {
  celulares: Celular[];
  paginacao: Paginacao;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

function parseCelular(value: unknown): Celular {
  if (
    !isRecord(value) ||
    (typeof value.idcelular !== "number" &&
      typeof value.idcelular !== "string") ||
    typeof value.marca !== "string" ||
    typeof value.modelo !== "string" ||
    (typeof value.preco !== "number" && typeof value.preco !== "string")
  ) {
    throw new Error("A API retornou dados de celular em um formato inválido.");
  }

  const preco = Number(value.preco);
  const idcelular = Number(value.idcelular);

  if (!Number.isFinite(preco) || !Number.isInteger(idcelular)) {
    throw new Error("A API retornou preço ou identificador inválido.");
  }

  return {
    idcelular,
    marca: value.marca,
    modelo: value.modelo,
    preco,
    descricao: typeof value.descricao === "string" ? value.descricao : "",
    dataCriacao:
      typeof value.dataCriacao === "string" ? value.dataCriacao : null,
  };
}

export async function listarCelulares(
  pagina: number,
  limite: number,
  signal?: AbortSignal,
): Promise<ListaCelulares> {
  const response = await fetch(
    `${API_BASE_URL}/celulares?page=${pagina}&limit=${limite}`,
    {
      headers: { Accept: "application/json" },
      signal,
    },
  );
  const payload = await readResponse(response);

  if (
    !isRecord(payload) ||
    !Array.isArray(payload.celulares) ||
    !isRecord(payload.paginacao)
  ) {
    throw new Error("A API retornou uma lista de celulares em formato inválido.");
  }

  const paginacao = payload.paginacao;
  if (
    !isFiniteNumber(paginacao.paginaAtual) ||
    !isFiniteNumber(paginacao.totalPaginas) ||
    !isFiniteNumber(paginacao.totalItems) ||
    !isFiniteNumber(paginacao.itemsPorPagina)
  ) {
    throw new Error("A API retornou informações de paginação inválidas.");
  }

  return {
    celulares: payload.celulares.map(parseCelular),
    paginacao: {
      paginaAtual: paginacao.paginaAtual,
      totalPaginas: paginacao.totalPaginas,
      totalItems: paginacao.totalItems,
      itemsPorPagina: paginacao.itemsPorPagina,
    },
  };
}

export async function criarCelular(
  celular: Pick<Celular, "marca" | "modelo" | "preco" | "descricao">,
  token: string,
): Promise<Celular> {
  const response = await fetch(`${API_BASE_URL}/celulares`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(celular),
  });
  const payload = await readResponse(response);

  if (!isRecord(payload) || !isRecord(payload.celular)) {
    throw new Error("A API não confirmou o cadastro do celular.");
  }

  return parseCelular(payload.celular);
}
