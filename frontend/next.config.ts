import path from "node:path";
import type { NextConfig } from "next";

// a raiz do app é esta pasta (há outro lockfile na raiz do repositório)
const raiz = path.join(__dirname);

const nextConfig: NextConfig = {
  // servidor mínimo em .next/standalone, usado pela imagem Docker
  output: "standalone",
  outputFileTracingRoot: raiz,
  turbopack: { root: raiz },
  // links antigos; todos temporários (permanent: false)
  async redirects() {
    const comId = [{ type: "query" as const, key: "celular", value: "(?<id>[1-9][0-9]{0,9})" }];
    return [
      { source: "/celulares/:id", destination: "/catalog/:id", permanent: false },
      { source: "/comments", has: comId, destination: "/catalog/:id#comentarios", permanent: false },
      { source: "/comments", destination: "/catalog", permanent: false },
      { source: "/catalog", has: comId, destination: "/catalog/:id", permanent: false },
    ];
  },
};

export default nextConfig;
