import { expect, test, type Page } from "@playwright/test";

// API mockada: o teste roda sem o core-api (e sem Docker)
const API = "http://localhost:8080";

// PNG 1x1 transparente, servido como foto do celular (testa o img-src da API)
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const celular = {
  idcelular: 7,
  idusuario: 1,
  marca: "Samsung",
  modelo: "Galaxy Teste",
  descricao: "Celular de teste",
  notaMedia: 4,
  avaliacoes: 1,
  dataCriacao: "2026-01-10T12:00:00.000Z",
  imagens: [{ idimagem: 1, url: "/celulares/imagens/1" }],
  modelo3d: null,
  especificacoes: null,
};

async function mockarApi(page: Page) {
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const cors = { "access-control-allow-origin": "*" };
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: { ...cors, "access-control-allow-headers": "*", "access-control-allow-methods": "*" },
      });
    }
    if (url.pathname.startsWith("/celulares/imagens/")) {
      return route.fulfill({ status: 200, contentType: "image/png", headers: cors, body: PNG });
    }
    const json = (corpo: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(corpo) });
    if (url.pathname === "/celulares") {
      return json({
        celulares: [celular],
        paginacao: { paginaAtual: 1, totalPaginas: 1, totalItems: 1, itemsPorPagina: 24 },
      });
    }
    if (url.pathname === "/celulares/7") return json(celular);
    if (url.pathname === "/comentarios/7") {
      return json({ comentarios: [], paginacao: { paginaAtual: 1, totalPaginas: 1, totalItems: 0, itemsPorPagina: 20 } });
    }
    return route.fulfill({ status: 404, headers: cors, body: "" });
  });
}

/** Registra as violações de CSP (inclusive as do modo Report-Only) em window. */
async function coletarViolacoes(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __violacoes: string[] };
    w.__violacoes = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__violacoes.push(`${e.effectiveDirective} ${e.blockedURI || "(inline)"}`);
    });
  });
}

test("documentos HTML saem com CSP (nonce) e os cabeçalhos de segurança", async ({ request }) => {
  const resposta = await request.get("/catalogo");
  const h = resposta.headers();
  const csp = h["content-security-policy"] ?? h["content-security-policy-report-only"];
  expect(csp).toBeTruthy();
  expect(csp).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'[^;]*'strict-dynamic'/);
  expect(csp).not.toMatch(/script-src [^;]*'unsafe-inline'/);
  for (const diretiva of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
    expect(csp).toContain(diretiva);
  }
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("camera=()");

  // cada requisição recebe um nonce novo, e é o mesmo dos <script> da página
  const nonce = /'nonce-([^']+)'/.exec(csp)![1];
  expect(await resposta.text()).toContain(`nonce="${nonce}"`);
  const outra = (await request.get("/catalogo")).headers();
  expect(outra["content-security-policy"] ?? outra["content-security-policy-report-only"]).not.toContain(nonce);
});

test("arquivos estáticos recebem os cabeçalhos simples", async ({ request }) => {
  const h = (await request.get("/icon.svg")).headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
});

for (const rota of ["/", "/catalogo", "/catalogo/7", "/login", "/register"]) {
  test(`${rota} não viola a CSP`, async ({ page }) => {
    await mockarApi(page);
    await coletarViolacoes(page);
    await page.goto(rota);
    await page.waitForLoadState("networkidle");
    const violacoes = await page.evaluate(() => (window as unknown as { __violacoes: string[] }).__violacoes);
    expect(violacoes).toEqual([]);
  });
}
