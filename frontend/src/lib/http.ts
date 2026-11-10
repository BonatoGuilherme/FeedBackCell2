import { API_BASE_URL } from "./config";
import { expireSession } from "./session";

/** Erro de uma resposta da API, com o status HTTP. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mensagemDeErro(status: number, payload: unknown, texto: string): string {
  if (isRecord(payload) && typeof payload.erro === "string") {
    // 400 de validação: {erro: "Validação falhou", detalhes: [...]}
    const detalhes = Array.isArray(payload.detalhes)
      ? payload.detalhes.filter((d): d is string => typeof d === "string")
      : [];
    return detalhes.length > 0 ? `${payload.erro}: ${detalhes.join("; ")}` : payload.erro;
  }
  // o rate limit (429) responde texto puro
  if (texto && texto.length <= 200 && !texto.includes("<")) return texto;
  return `Não foi possível concluir a solicitação (HTTP ${status}).`;
}

/**
 * Lê o JSON da resposta ou lança ApiError com a mensagem {erro} do core-api.
 * Um 401 numa requisição autenticada encerra a sessão (token expirado ou inválido).
 */
export async function readResponse(response: Response, autenticada = false): Promise<unknown> {
  const texto = await response.text();
  let payload: unknown = null;

  if (texto) {
    try {
      payload = JSON.parse(texto) as unknown;
    } catch {
      if (response.ok) {
        throw new ApiError("A API retornou uma resposta inválida.", response.status);
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && autenticada) {
      expireSession();
      throw new ApiError("Sua sessão expirou. Entre novamente para continuar.", 401);
    }
    throw new ApiError(mensagemDeErro(response.status, payload, texto), response.status);
  }

  return payload;
}

type Opcoes = Omit<RequestInit, "headers" | "body"> & {
  /** Token JWT enviado como Authorization: Bearer. */
  token?: string;
  /** Objeto vira JSON; Blob/File vai como corpo binário com o próprio Content-Type. */
  body?: unknown;
};

/** fetch no core-api: monta a URL, os headers e trata a resposta. */
export async function apiFetch(caminho: string, { token, body, ...init }: Opcoes = {}): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let corpo: BodyInit | undefined;

  if (body instanceof Blob) {
    headers["Content-Type"] = body.type;
    corpo = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    corpo = JSON.stringify(body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${caminho}`, { ...init, headers, body: corpo });
  } catch (erro) {
    // cancelamento (AbortController) segue como está; falha de rede vira mensagem em português
    // no lugar do "Failed to fetch" / "NetworkError" cru do navegador
    if (erro instanceof DOMException && erro.name === "AbortError") throw erro;
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.", {
      cause: erro,
    });
  }
  return readResponse(response, Boolean(token));
}
