const SESSION_EVENT = "feedbackcell-session-change";
const MAX_TIMEOUT = 2_147_483_647;

const TOKEN_KEY = "token";

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const encodedPayload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const decodedPayload = Uint8Array.from(
      window.atob(encodedPayload),
      (character) => character.charCodeAt(0),
    );
    const payload: unknown = JSON.parse(new TextDecoder().decode(decodedPayload));
    return typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getTokenExpiration(token: string): number | null {
  const exp = decodeTokenPayload(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
}

function getTokenUserId(token: string): number | null {
  const payload = decodeTokenPayload(token);
  if (!payload) return null;
  const idusuario = Number(payload.idusuario);

  if (
    !Number.isSafeInteger(idusuario) ||
    typeof payload.exp !== "number" ||
    payload.exp <= Date.now() / 1000
  ) {
    return null;
  }

  return idusuario;
}

/**
 * Token JWT do core-api. Fica no localStorage (o core-api autentica só pelo header
 * Authorization, sem cookie), por isso a página não deve renderizar HTML vindo de terceiros.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  notifySessionChange();
}

/** Sai da conta (logout ou 401 da API): remove o token e avisa o AuthLayout. */
export function expireSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // armazenamento bloqueado: não há o que remover
  }
  notifySessionChange();
}

export function getSessionSnapshot(): boolean {
  const token = getToken();
  if (!token) return false;

  const expiration = getTokenExpiration(token);
  if (expiration !== null && expiration > Date.now() / 1000) return true;

  window.localStorage.removeItem(TOKEN_KEY);
  return false;
}

export function getSessionUserId(): number | null {
  const token = getToken();
  return token ? getTokenUserId(token) : null;
}

// No servidor (e durante a hidratação) a sessão é desconhecida: null, e não false,
// para não redirecionar ao login antes de o navegador ler o token.
export function getServerSessionSnapshot(): boolean | null {
  return null;
}

export function subscribeToSession(callback: () => void): () => void {
  let expirationTimer: number | undefined;

  const clearExpirationTimer = () => {
    if (expirationTimer !== undefined) {
      window.clearTimeout(expirationTimer);
      expirationTimer = undefined;
    }
  };

  const scheduleExpirationCheck = () => {
    clearExpirationTimer();

    const token = getToken();
    const expiration = token ? getTokenExpiration(token) : null;
    if (expiration === null) return;

    const remaining = expiration * 1000 - Date.now();
    expirationTimer = window.setTimeout(
      () => {
        const currentToken = getToken();
        const currentExpiration = currentToken
          ? getTokenExpiration(currentToken)
          : null;
        if (
          currentToken &&
          currentExpiration !== null &&
          currentExpiration <= Date.now() / 1000
        ) {
          window.localStorage.removeItem(TOKEN_KEY);
        }

        callback();
        scheduleExpirationCheck();
      },
      Math.min(MAX_TIMEOUT, Math.max(1, remaining + 1)),
    );
  };

  const handleSessionChange = () => {
    scheduleExpirationCheck();
    callback();
  };

  window.addEventListener("storage", handleSessionChange);
  window.addEventListener(SESSION_EVENT, handleSessionChange);
  scheduleExpirationCheck();

  return () => {
    clearExpirationTimer();
    window.removeEventListener("storage", handleSessionChange);
    window.removeEventListener(SESSION_EVENT, handleSessionChange);
  };
}

export function notifySessionChange(): void {
  window.dispatchEvent(new Event(SESSION_EVENT));
}
