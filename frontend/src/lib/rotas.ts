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

/** Link para a tela de login que volta para `destino` depois de entrar. */
export function hrefLogin(destino: string, pagina: "login" | "register" = "login"): string {
  const seguro = caminhoSeguro(destino);
  return seguro && seguro !== "/" ? `/${pagina}?next=${encodeURIComponent(seguro)}` : `/${pagina}`;
}

/** Destino que exige conta: visitante vai para o login com `next`. */
export function hrefProtegido(destino: string, logado: boolean | null): string {
  return logado === true ? destino : hrefLogin(destino);
}
