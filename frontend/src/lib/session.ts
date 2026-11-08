const SESSION_EVENT = "feedbackcell-session-change";
const MAX_TIMEOUT = 2_147_483_647;

function getTokenExpiration(token: string): number | null {
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
    const payload = JSON.parse(
      new TextDecoder().decode(decodedPayload),
    ) as { exp?: unknown };

    return typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp
      : null;
  } catch {
    return null;
  }
}

function getTokenUserId(token: string): number | null {
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
    const payload = JSON.parse(
      new TextDecoder().decode(decodedPayload),
    ) as { idusuario?: unknown; exp?: unknown };
    const idusuario = Number(payload.idusuario);

    if (
      !Number.isSafeInteger(idusuario) ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now() / 1000
    ) {
      return null;
    }

    return idusuario;
  } catch {
    return null;
  }
}

export function getSessionSnapshot(): boolean {
  const token = window.localStorage.getItem("token");
  if (!token) return false;

  const expiration = getTokenExpiration(token);
  if (expiration !== null && expiration > Date.now() / 1000) return true;

  window.localStorage.removeItem("token");
  return false;
}

export function getSessionUserId(): number | null {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem("token");
  return token ? getTokenUserId(token) : null;
}

export function getServerSessionSnapshot(): boolean {
  return false;
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

    const token = window.localStorage.getItem("token");
    const expiration = token ? getTokenExpiration(token) : null;
    if (expiration === null) return;

    const remaining = expiration * 1000 - Date.now();
    expirationTimer = window.setTimeout(
      () => {
        const currentToken = window.localStorage.getItem("token");
        const currentExpiration = currentToken
          ? getTokenExpiration(currentToken)
          : null;
        if (
          currentToken &&
          currentExpiration !== null &&
          currentExpiration <= Date.now() / 1000
        ) {
          window.localStorage.removeItem("token");
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
