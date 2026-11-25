import { expect, test, type Page } from "@playwright/test";

// API mockada: o teste roda sem o core-api (e sem Docker)
const API = "http://localhost:8080";

const celular = {
  idcelular: 7,
  idusuario: 1,
  marca: "Samsung",
  modelo: "Galaxy Teste",
  descricao: "Celular de teste",
  notaMedia: 4,
  avaliacoes: 1,
  dataCriacao: "2026-01-10T12:00:00.000Z",
  imagens: [],
  modelo3d: null,
  especificacoes: {
    nome: "Samsung Galaxy Teste",
    tela: "6,1 polegadas",
    armazenamento: "128 GB",
    creditoImagem: "Foto: Fulano · CC BY-SA 4.0 · Wikimedia Commons",
    creditoImagemUrl: "https://commons.wikimedia.org/wiki/File:Teste.jpg",
    creditoFicha: "Ficha: GSMArena",
    creditoFichaUrl: "https://www.gsmarena.com/teste.php",
  },
};

function jwtFalso() {
  const base64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${base64({ alg: "HS256" })}.${base64({ idusuario: 99, exp })}.assinatura`;
}

async function mockarApi(page: Page) {
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (corpo: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(corpo),
      });

    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    }
    if (url.pathname === "/auth/login") return json({ token: jwtFalso() });
    if (url.pathname === "/celulares") {
      return json({
        celulares: [celular],
        paginacao: { paginaAtual: 1, totalPaginas: 1, totalItems: 1, itemsPorPagina: 24 },
      });
    }
    if (url.pathname === "/celulares/7") return json(celular);
    if (url.pathname === "/comentarios/7") {
      return json({
        comentarios: [
          { idcomentario: 1, idusuario: 5, Nome: "Maria", texto: "Ótimo aparelho!", nota: 4, dataCriacao: "2026-02-01T10:00:00.000Z" },
        ],
        paginacao: { paginaAtual: 1, totalPaginas: 1, totalItems: 1, itemsPorPagina: 20 },
      });
    }
    return json({ erro: "não mockado" }, 404);
  });
}

test.beforeEach(async ({ page }) => {
  await mockarApi(page);
});

test("visitante vê o catálogo e o detalhe com comentários, sem ir ao login", async ({ page }) => {
  await page.goto("/catalogo");
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("heading", { name: "Catálogo de celulares" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Samsung Galaxy Teste/ })).toBeVisible();

  await page.goto("/catalogo/7");
  await expect(page).toHaveURL(/\/catalogo\/7$/);
  await expect(page.getByText("Ótimo aparelho!")).toBeVisible();
  // créditos aparecem em linha própria e não como linha da tabela de especificações
  const creditos = page.locator(".phone-detail__credits");
  await expect(creditos).toHaveText("Ficha: GSMArena");
  const link = creditos.getByRole("link", { name: "Ficha: GSMArena" });
  await expect(link).toHaveAttribute("href", "https://www.gsmarena.com/teste.php");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAttribute("target", "_blank");
  // os créditos não viram linha da tabela de especificações
  await expect(page.locator(".phone-detail__specs")).not.toContainText(/GSMArena|Fulano/);
});

test("visitante que quer avaliar é levado ao login com next", async ({ page }) => {
  await page.goto("/catalogo/7");
  await expect(page.getByRole("heading", { name: "Entre para avaliar" })).toBeVisible();
  await expect(page.locator("#comment-text")).toHaveCount(0);

  await page.getByRole("link", { name: "Entrar", exact: true }).last().click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcatalogo%2F7%23comentarios$/);
  // "Criar conta" repassa o next
  await expect(page.getByRole("link", { name: "Criar conta" })).toHaveAttribute(
    "href",
    "/register?next=%2Fcatalogo%2F7%23comentarios",
  );
});

test("adicionar celular, sem conta, leva ao login com next", async ({ page }) => {
  await page.goto("/catalogo");
  await page.getByRole("link", { name: "Adicionar celular" }).first().click();
  await expect(page).toHaveURL(/\/login\?next=%2Fitems%2Fnew$/);

  // abrir a rota protegida direto também redireciona
  await page.goto("/items/new");
  await expect(page).toHaveURL(/\/login\?next=%2Fitems%2Fnew$/);
});

test("depois do login volta para o next", async ({ page }) => {
  await page.goto("/login?next=%2Fcatalogo%2F7");
  await page.locator("#email").fill("maria@teste.com");
  await page.locator("#senha").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/catalogo\/7$/);
  // logado: o formulário de comentário aparece
  await expect(page.locator("#comment-text")).toBeVisible();
});

test("next externo é ignorado", async ({ page }) => {
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"]) {
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    await page.locator("#email").fill("maria@teste.com");
    await page.locator("#senha").fill("123456");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/catalogo$/);
    await page.evaluate(() => window.localStorage.clear());
  }
});

test("/catalog redireciona para /catalogo", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page).toHaveURL(/\/catalogo$/);
  await page.goto("/catalog/7");
  await expect(page).toHaveURL(/\/catalogo\/7$/);
});
