import path from "node:path";
import type { NextConfig } from "next";

// a raiz do app é esta pasta (há outro lockfile na raiz do repositório)
const raiz = path.join(__dirname);

const nextConfig: NextConfig = {
  // servidor mínimo em .next/standalone, usado pela imagem Docker
  output: "standalone",
  outputFileTracingRoot: raiz,
  turbopack: { root: raiz },
};

export default nextConfig;
