"use client";

import { useSyncExternalStore } from "react";
import { getServerSessionSnapshot, getSessionSnapshot, subscribeToSession } from "./session";

/** true = logado, false = visitante, null = ainda não sabemos (servidor/hidratação). */
export function useHasSession(): boolean | null {
  return useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);
}
