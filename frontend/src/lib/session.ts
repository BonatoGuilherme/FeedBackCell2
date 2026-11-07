const SESSION_EVENT = "feedbackcell-session-change";

export function getSessionSnapshot(): boolean {
  return Boolean(window.localStorage.getItem("token"));
}

export function getServerSessionSnapshot(): boolean {
  return false;
}

export function subscribeToSession(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

export function notifySessionChange(): void {
  window.dispatchEvent(new Event(SESSION_EVENT));
}
