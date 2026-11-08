import { API_BASE_URL } from "./config";
import { apiFetch, isRecord } from "./http";

export type CelularImagem = {
  idimagem: number;
  /** URL absoluta, pronta para usar em <img src>. */
  url: string;
};

/** Especificações salvas com o celular (sem a imagem, que vira uma foto). */
export type Especificacoes = Omit<AparelhoEspecificacoes, "imagem" | "imagemHd">;

export type Celular = {
  idcelular: number;
  idusuario?: number;
  marca: string;
  modelo: string;
  preco: number;
  descricao: string;
  dataCriacao?: string | null;
  imagens: CelularImagem[];
  especificacoes: Especificacoes | null;
  /** uid do modelo 3D no Sketchfab. */
  modelo3d: string | null;
};

export const MAX_FOTOS = 10;
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

function parseImagens(value: unknown): CelularImagem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.url !== "string") return [];
    const idimagem = Number(item.idimagem);
    if (!Number.isInteger(idimagem) || !item.url.startsWith("/celulares/imagens/")) return [];
    return [{ idimagem, url: `${API_BASE_URL}${item.url}` }];
  });
}

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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
    idusuario: typeof value.idusuario === "number" ? value.idusuario : undefined,
    marca: value.marca,
    modelo: value.modelo,
    preco,
    descricao: typeof value.descricao === "string" ? value.descricao : "",
    dataCriacao:
      typeof value.dataCriacao === "string" ? value.dataCriacao : null,
    imagens: parseImagens(value.imagens),
    especificacoes: parseEspecificacoes(value.especificacoes),
    modelo3d:
      typeof value.modelo3d === "string" && /^[0-9a-f]{32}$/.test(value.modelo3d)
        ? value.modelo3d
        : null,
  };
}

function parseEspecificacoes(value: unknown): Especificacoes | null {
  const aparelho = parseAparelho(value);
  if (!aparelho) return null;
  const { imagem: _imagem, imagemHd: _imagemHd, ...especificacoes } = aparelho;
  void _imagem;
  void _imagemHd;
  return Object.values(especificacoes).some(Boolean) ? especificacoes : null;
}

/** URL do visualizador embutido do Sketchfab para um uid salvo. */
export function sketchfabEmbedUrl(uid: string) {
  return `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_infos=0&ui_watermark_link=0`;
}

export async function listarCelulares(
  pagina: number,
  limite: number,
  signal?: AbortSignal,
): Promise<ListaCelulares> {
  const payload = await apiFetch(`/celulares?page=${pagina}&limit=${limite}`, { signal });

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
  celular: Pick<Celular, "marca" | "modelo" | "preco" | "descricao"> &
    Partial<Pick<Celular, "especificacoes" | "modelo3d">>,
  token: string,
): Promise<Celular> {
  const payload = await apiFetch("/celulares", { method: "POST", token, body: celular });

  if (!isRecord(payload) || !isRecord(payload.celular)) {
    throw new Error("A API não confirmou o cadastro do celular.");
  }

  return parseCelular(payload.celular);
}

/** Envia uma foto (binário) para um celular já cadastrado. */
export async function enviarFoto(
  idcelular: number,
  arquivo: File,
  token: string,
): Promise<CelularImagem> {
  // o core-api recebe a foto como corpo binário (image/jpeg|png|webp), não multipart
  const payload = await apiFetch(`/celulares/${idcelular}/imagens`, {
    method: "POST",
    token,
    body: arquivo,
  });
  const [imagem] = isRecord(payload) ? parseImagens([payload.imagem]) : [];
  if (!imagem) throw new Error("A API não confirmou o envio da foto.");
  return imagem;
}

/**
 * Baixa a foto em alta resolução (Wikimedia libera CORS) para enviar como foto do
 * celular. Devolve null se falhar, para usar a miniatura no lugar.
 */
export async function baixarImagemHd(url: string, nome: string): Promise<File | null> {
  if (!URL_IMAGEM_HD.test(url)) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!TIPOS_FOTO.includes(blob.type) || blob.size > MAX_FOTO_BYTES) return null;
    return new File([blob], `${nome}.${blob.type.split("/")[1]}`, { type: blob.type });
  } catch {
    return null;
  }
}

/** Converte a imagem data: da busca num arquivo, para enviar como foto. */
export function dataUriParaArquivo(dataUri: string, nome: string): File | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUri);
  if (!match) return null;
  const binario = window.atob(match[2]);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  const extensao = match[1].split("/")[1];
  return new File([bytes], `${nome}.${extensao}`, { type: match[1] });
}

/** Valida uma foto antes do envio; devolve a mensagem de erro ou null. */
export function validarFoto(arquivo: File): string | null {
  if (!TIPOS_FOTO.includes(arquivo.type)) {
    return `"${arquivo.name}" não é JPEG, PNG ou WebP.`;
  }
  if (arquivo.size > MAX_FOTO_BYTES) {
    return `"${arquivo.name}" passa de 5 MB.`;
  }
  return null;
}

export type AparelhoEspecificacoes = {
  nome: string | null;
  fabricante: string | null;
  /** Miniatura (~160 px) da MobileAPI, data:image/... */
  imagem: string | null;
  /** Foto em alta resolução (Wikimedia Commons), quando houver. */
  imagemHd: string | null;
  /** Crédito e link da foto em alta resolução (a licença exige atribuição). */
  creditoImagem: string | null;
  creditoImagemUrl: string | null;
  lancamento: string | null;
  tela: string | null;
  hardware: string | null;
  armazenamento: string | null;
  camera: string | null;
  bateria: string | null;
  peso: string | null;
  espessura: string | null;
  cores: string | null;
};

export type Modelo3d = {
  nome: string | null;
  autor: string | null;
  embedUrl: string;
  viewerUrl: string;
  thumbnail: string | null;
};

export type ResultadoEspecificacoes = {
  aparelho: AparelhoEspecificacoes | null;
  /** Aparelhos parecidos, para o autocomplete. */
  sugestoes: AparelhoEspecificacoes[];
  modelo3d: Modelo3d | null;
  avisos: string[];
};

const CAMPOS_APARELHO = [
  "nome", "fabricante", "imagem", "imagemHd", "creditoImagem", "creditoImagemUrl",
  "lancamento", "tela", "hardware", "armazenamento", "camera", "bateria", "peso",
  "espessura", "cores",
] as const;

const URL_IMAGEM_HD = /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\//;
const URL_CREDITO = /^https:\/\/commons\.wikimedia\.org\/wiki\//;

function parseAparelho(value: unknown): AparelhoEspecificacoes | null {
  if (!isRecord(value)) return null;
  const aparelho = {} as AparelhoEspecificacoes;
  for (const campo of CAMPOS_APARELHO) {
    const v = value[campo];
    aparelho[campo] = typeof v === "string" && v ? v : null;
  }
  if (aparelho.imagem && !/^data:image\/(jpeg|png|webp);base64,/.test(aparelho.imagem)) {
    aparelho.imagem = null;
  }
  if (aparelho.imagemHd && !URL_IMAGEM_HD.test(aparelho.imagemHd)) aparelho.imagemHd = null;
  if (aparelho.creditoImagemUrl && !URL_CREDITO.test(aparelho.creditoImagemUrl)) aparelho.creditoImagemUrl = null;
  return aparelho;
}

function parseModelo3d(value: unknown): Modelo3d | null {
  if (!isRecord(value) || typeof value.embedUrl !== "string" || typeof value.viewerUrl !== "string") {
    return null;
  }
  if (!/^https:\/\/sketchfab\.com\/models\/[0-9a-f]{32}\/embed$/.test(value.embedUrl)) return null;
  return {
    nome: typeof value.nome === "string" ? value.nome : null,
    autor: typeof value.autor === "string" ? value.autor : null,
    embedUrl: value.embedUrl,
    viewerUrl: value.viewerUrl,
    thumbnail:
      typeof value.thumbnail === "string" && value.thumbnail.startsWith("https://")
        ? value.thumbnail
        : null,
  };
}

/** Busca especificações (MobileAPI.dev) e modelo 3D (Sketchfab) pela marca e modelo. */
export async function buscarEspecificacoes(
  marca: string,
  modelo: string,
  token: string,
  { signal, somente3d = false }: { signal?: AbortSignal; somente3d?: boolean } = {},
): Promise<ResultadoEspecificacoes> {
  const params = new URLSearchParams({ marca: marca.trim(), modelo: modelo.trim() });
  if (somente3d) params.set("somente3d", "1");
  const payload = await apiFetch(`/celulares/especificacoes?${params}`, { token, signal });
  if (!isRecord(payload)) throw new Error("A API retornou especificações em formato inválido.");

  return {
    aparelho: parseAparelho(payload.aparelho),
    sugestoes: Array.isArray(payload.sugestoes)
      ? payload.sugestoes.flatMap((s) => {
          const aparelho = parseAparelho(s);
          return aparelho?.nome ? [aparelho] : [];
        })
      : [],
    modelo3d: parseModelo3d(payload.modelo3d),
    avisos: Array.isArray(payload.avisos)
      ? payload.avisos.filter((a): a is string => typeof a === "string")
      : [],
  };
}

/** Um celular pelo id (para abrir direto o celular escolhido na home). */
export async function buscarCelular(idcelular: number, signal?: AbortSignal): Promise<Celular> {
  return parseCelular(await apiFetch(`/celulares/${idcelular}`, { signal }));
}
