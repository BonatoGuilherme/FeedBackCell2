/**
 * Paleta do prédio (/predio) para código: os canvas das próximas fases (lua,
 * chuva, janelas) não leem variáveis CSS. Os mesmos valores estão em
 * app/styles/predio-tokens.css; lima, rosa e creme vêm do Letreiro (app/globals.css).
 */
export const paleta = {
  noite0: "#06070f",
  noite1: "#0c1022",
  indigo: "#1a1240",
  roxo: "#3a2a78",
  lavanda: "#8a74c9",
  petroleo: "#0b2f3f",
  ciano: "#3fd6ff",
  azulNeon: "#2f7bff",
  magenta: "#d93cff",
  vermelho: "#ff3b3b",
  ambar: "#ffb347",
  /* só nos elementos do site (botões, título, notas) */
  lima: "#dcff2e",
  rosa: "#ff2d8a",
  creme: "#fff6e0",
} as const;

export type CorDaPaleta = keyof typeof paleta;

/** Cores que o cenário pode usar (lima e rosa ficam para o site). */
export const coresDoCenario: readonly CorDaPaleta[] = ["ciano", "vermelho", "ambar", "magenta", "azulNeon"];
