/**
 * Content-Security-Policy do front. O JWT fica no localStorage, então a CSP é a
 * principal defesa contra XSS: só roda script com o nonce da requisição.
 *
 * Por padrão sai como Content-Security-Policy-Report-Only (só avisa no console);
 * CSP_ENFORCE=true troca para Content-Security-Policy (bloqueia).
 */
import { API_BASE_URL } from "./config";

/** Fotos da Wikimedia (busca de especificações) e miniaturas do Sketchfab. */
const WIKIMEDIA = ["https://upload.wikimedia.org", "https://thumb.wikimedia.org"];
const SKETCHFAB_MIDIA = "https://media.sketchfab.com";
/** Visualizador 3D embutido (iframe). */
const SKETCHFAB = "https://sketchfab.com";

/** Origem do core-api; null quando a URL é relativa ("/api" no Docker = 'self'). */
export function origemDaApi(apiUrl: string = API_BASE_URL): string | null {
  if (!/^https?:\/\//i.test(apiUrl)) return null;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
}

type OpcoesCsp = {
  nonce: string;
  apiUrl?: string;
  /** next dev precisa de eval (React Refresh) e de WebSocket para o HMR */
  dev?: boolean;
};

export function montarCsp({ nonce, apiUrl, dev = false }: OpcoesCsp): string {
  const api = origemDaApi(apiUrl) ?? "";
  const diretivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    // nonce + strict-dynamic: só scripts do Next (com o nonce) e os que eles carregam.
    // wasm-unsafe-eval: decodificador meshopt (WebAssembly) dos modelos .glb
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "'wasm-unsafe-eval'", ...(dev ? ["'unsafe-eval'"] : [])],
    // atributos style= do React/motion não aceitam nonce
    "style-src": ["'self'", "'unsafe-inline'"],
    // data:/blob: = miniaturas da API, prévias locais e texturas dos .glb
    "img-src": ["'self'", "data:", "blob:", api, ...WIKIMEDIA, SKETCHFAB_MIDIA],
    "font-src": ["'self'"],
    // Wikimedia: foto em alta da busca; blob: = o carregador dos .glb lê as texturas com fetch
    "connect-src": ["'self'", api, ...WIKIMEDIA, "blob:", ...(dev ? ["ws:"] : [])],
    "frame-src": [SKETCHFAB],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(diretivas)
    .map(([nome, valores]) => [nome, ...valores.filter(Boolean)].join(" "))
    .join("; ");
}

/** Nome do cabeçalho: bloqueante só com CSP_ENFORCE=true. */
export function cabecalhoCsp(enforce: string | undefined = process.env.CSP_ENFORCE): string {
  return enforce === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

/** Cabeçalhos simples, iguais em toda resposta (next.config headers()). */
export const CABECALHOS_SEGURANCA = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];
