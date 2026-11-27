import { expect, test, type Page } from "@playwright/test";

// API mockada: o teste roda sem o core-api (e sem Docker)
const API = "http://localhost:8080";

const celular = (idcelular: number, marca: string, modelo: string, notaMedia: number | null, avaliacoes: number) => ({
  idcelular,
  marca,
  modelo,
  descricao: "",
  notaMedia,
  avaliacoes,
  imagens: [],
  modelo3d: null,
  especificacoes: null,
});

async function mockarApi(page: Page, status: number) {
  await page.route(`${API}/**`, (route) => {
    const headers = { "access-control-allow-origin": "*" };
    if (status !== 200) {
      return route.fulfill({ status, headers, contentType: "application/json", body: '{"erro":"fora do ar"}' });
    }
    return route.fulfill({
      status,
      headers,
      contentType: "application/json",
      body: JSON.stringify({
        celulares: [celular(1, "Samsung", "Galaxy A", 4, 2), celular(2, "Motorola", "Moto G", null, 0)],
        paginacao: { paginaAtual: 1, totalPaginas: 1, totalItems: 2, itemsPorPagina: 50 },
      }),
    });
  });
}

test("o prédio tem 1 h1, 7 h2 e o elevador leva ao térreo", async ({ page }) => {
  await mockarApi(page, 200);
  await page.goto("/predio");

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText(/FEEDBACK\s*CELL/);
  await expect(page.locator("h2")).toHaveCount(7);
  await expect(page.getByText("★ 4,0").first()).toBeVisible();

  await page.getByRole("link", { name: "Ir para Térreo" }).click();
  await expect(page.locator("#entrada")).toBeInViewport();
  await expect(page.getByText("2 celulares no catálogo")).toBeVisible();
});

test("o telão de destaque mostra SEM SINAL quando a API falha", async ({ page }) => {
  await mockarApi(page, 500);
  await page.goto("/predio");

  const destaque = page.locator("#destaque");
  await expect(destaque.getByText("SEM SINAL")).toBeVisible();
  await expect(destaque.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
});

test("topo: pular para o conteúdo, rodapé geral escondido e aviso na placa", async ({ page }) => {
  await mockarApi(page, 200);
  await page.goto("/predio");

  await expect(page.locator(".app-footer")).toBeHidden();
  await expect(page.locator("#entrada").getByText("Projeto de demonstração: não use dados reais.")).toBeAttached();

  const pular = page.getByRole("link", { name: "Pular para o conteúdo" });
  await pular.focus();
  await expect(pular).toBeVisible();
  await pular.press("Enter");
  await expect(page.locator("#topo")).toBeFocused();
});

test("com menos movimento a faixa de LED para e a cópia some", async ({ browser }) => {
  const contexto = await browser.newContext({ reducedMotion: "reduce" });
  const page = await contexto.newPage();
  await mockarApi(page, 200);
  await page.goto("/predio");

  await expect(page.locator(".faixa-led__copia")).toBeHidden();
  await expect(page.locator(".faixa-led__trilho")).toHaveCSS("animation-name", "none");
  await contexto.close();
});
