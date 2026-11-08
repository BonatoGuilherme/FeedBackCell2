/**
 * Endereço do core-api. Em Docker vale "/api" (nginx repassa ao core-api), embutido
 * no build pelo ARG NEXT_PUBLIC_API_URL; fora dele, o core-api local na porta 8080.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/+$/, "");
