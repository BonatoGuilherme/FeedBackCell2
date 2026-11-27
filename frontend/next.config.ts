import path from "node:path";
import type { NextConfig } from "next";
import { CABECALHOS_SEGURANCA } from "./src/lib/csp";

// a raiz do app é esta pasta (há outro lockfile na raiz do repositório)
const raiz = path.join(__dirname);

const nextConfig: NextConfig = {
  // servidor mínimo em .next/standalone, usado pela imagem Docker
  output: "standalone",
  outputFileTracingRoot: raiz,
  turbopack: { root: raiz },
  // cabeçalhos simples em toda resposta; a CSP (com nonce) sai do proxy.ts
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_SEGURANCA }];
  },
  // links antigos; todos temporários (permanent: false)
  async redirects() {
    const comId = [{ type: "query" as const, key: "celular", value: "(?<id>[1-9][0-9]{0,9})" }];
    return [
      { source: "/celulares/:id", destination: "/catalogo/:id", permanent: false },
      { source: "/comments", has: comId, destination: "/catalogo/:id#comentarios", permanent: false },
      { source: "/comments", destination: "/catalogo", permanent: false },
      // rota antiga do catálogo (renomeada para /catalogo)
      { source: "/catalog", has: comId, destination: "/catalogo/:id", permanent: false },
      { source: "/catalog/:path*", destination: "/catalogo/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
