import { NextResponse, type NextRequest } from "next/server";
import { cabecalhoCsp, montarCsp } from "@/src/lib/csp";

/**
 * Gera um nonce por requisição e monta a CSP. O Next lê a CSP do cabeçalho da
 * requisição e põe o nonce nos próprios <script>; por isso as páginas são
 * renderizadas por requisição (o layout lê headers()).
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const nome = cabecalhoCsp();
  const csp = montarCsp({ nonce, dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(nome, csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(nome, csp);
  return response;
}

export const config = {
  matcher: [
    {
      // só documentos HTML: arquivos estáticos, imagens otimizadas e prefetch ficam de fora
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand-mark.svg|phones/|.*\.(?:png|jpg|jpeg|svg|webp|glb|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
