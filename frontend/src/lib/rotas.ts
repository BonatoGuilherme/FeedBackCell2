/**
 * Destino interno após login ou cadastro (parâmetro `next`).
 * Só aceita caminho do próprio site: começa com "/" e não com "//" nem "/\\",
 * sem esquema e sem caracteres de controle (evita open redirect).
 */
export function caminhoSeguro(valor: string | null | undefined): string | null {
  if (!valor || valor.length > 2000) return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return null;
  if ([...valor].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || c === String.fromCharCode(92))) return null;
  try {
    // resolve contra uma origem falsa: se a origem mudar, o valor apontava para fora
    const base = "http://origem.invalida";
    if (new URL(valor, base).origin !== base) return null;
  } catch {
    return null;
  }
  return valor;
}

/** Valor de `motivo` no login quando a sessão expirou (token vencido ou 401). */
export const MOTIVO_SESSAO_EXPIRADA = "sessao-expirada";

/**
 * Link para a tela de login que volta para `destino` depois de entrar.
 * Com `expirou`, o login mostra o aviso de sessão expirada.
 */
export function hrefLogin(
  destino: string,
  pagina: "login" | "register" = "login",
  { expirou = false }: { expirou?: boolean } = {},
): string {
  const seguro = caminhoSeguro(destino);
  const params: string[] = [];
  if (seguro && seguro !== "/") params.push(`next=${encodeURIComponent(seguro)}`);
  if (expirou) params.push(`motivo=${MOTIVO_SESSAO_EXPIRADA}`);
  return params.length > 0 ? `/${pagina}?${params.join("&")}` : `/${pagina}`;
}

/** Destino que exige conta: visitante vai para o login com `next`. */
export function hrefProtegido(destino: string, logado: boolean | null): string {
  return logado === true ? destino : hrefLogin(destino);
}
