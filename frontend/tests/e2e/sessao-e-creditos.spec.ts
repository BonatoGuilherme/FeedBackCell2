import { expect, test, type Page, type Route } from "@playwright/test";

// API mockada: o teste roda sem o core-api (e sem Docker)
const API = "http://localhost:8080";
const MSG_429 =
  "Você já usou sua busca automática de hoje. Ela volta amanhã; enquanto isso, dá para preencher a ficha do celular à mão.";

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
  especificacoes: null,
};

function jwtFalso(segundos = 3600) {
  const base64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + segundos;
  return `${base64({ alg: "HS256" })}.${base64({ idusuario: 99, exp })}.assinatura`;
}

/** Entra com o token só na primeira carga da aba (não volta a pôr o token depois do 401). */
async function logar(page: Page, token = jwtFalso()) {
  await page.addInitScript((t) => {
    if (!window.sessionStorage.getItem("e2e-logado")) {
      window.sessionStorage.setItem("e2e-logado", "1");
      window.localStorage.setItem("token", t);
    }
  }, token);
}

type Resposta = { status: number; corpo: unknown };
type Rotas = {
  creditos?: () => Resposta;
  especificacoes?: () => Resposta;
  comentar?: () => Resposta;
};

async function mockarApi(page: Page, rotas: Rotas = {}) {
  const chamadas = { creditos: 0, especificacoes: 0 };
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = ({ status, corpo }: Resposta) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(corpo),
      });

    if (req.method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    }
    if (url.pathname === "/celulares/especificacoes/creditos") {
      chamadas.creditos++;
      return json(rotas.creditos?.() ?? { status: 200, corpo: { restantesMes: 42, restantesHoje: 5, usuarioPodeBuscarHoje: true } });
    }
    if (url.pathname === "/celulares/especificacoes") {
      chamadas.especificacoes++;
      return json(rotas.especificacoes?.() ?? { status: 200, corpo: { aparelho: null, sugestoes: [], modelo3d: null, avisos: [] } });
    }
    if (url.pathname === "/celulares") {
      return json({
        status: 200,
        corpo: { celulares: [celular], paginacao: { paginaAtual: 1, totalPaginas: 1, totalItems: 1, itemsPorPagina: 24 } },
      });
    }
    if (url.pathname === "/celulares/7") return json({ status: 200, corpo: celular });
    if (url.pathname === "/comentarios/7" && req.method() === "POST") {
      return json(rotas.comentar?.() ?? { status: 201, corpo: {} });
    }
    if (url.pathname === "/comentarios/7") {
      return json({
        status: 200,
        corpo: { comentarios: [], paginacao: { paginaAtual: 1, totalPaginas: 1, totalItems: 0, itemsPorPagina: 20 } },
      });
    }
    return json({ status: 404, corpo: { erro: "não mockado" } });
  });
  return chamadas;
}

const botaoBuscar = (page: Page) => page.getByRole("button", { name: "Buscar especificações e imagem" });

test.describe("sessão expirada", () => {
  test("401 numa chamada autenticada limpa a sessão e leva ao login com next", async ({ page }) => {
    await logar(page);
    await mockarApi(page, { creditos: () => ({ status: 401, corpo: { erro: "Token inválido" } }) });

    await page.goto("/items/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fitems%2Fnew&motivo=sessao-expirada$/);
    await expect(page.getByText("Sua sessão expirou. Entre novamente para continuar.")).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("token"))).toBeNull();
  });

  test("token vencido também mostra o aviso no login", async ({ page }) => {
    await logar(page, jwtFalso(-60));
    await mockarApi(page);

    await page.goto("/items/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fitems%2Fnew&motivo=sessao-expirada$/);
    await expect(page.getByText("Sua sessão expirou. Entre novamente para continuar.")).toBeVisible();
  });

  test("visitante sem sessão vai ao login sem o aviso de expiração", async ({ page }) => {
    await mockarApi(page);
    await page.goto("/items/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fitems%2Fnew$/);
    await expect(page.getByText("Sua sessão expirou")).toHaveCount(0);
  });

  test("401 em página pública sai da conta sem redirecionar", async ({ page }) => {
    await logar(page);
    await mockarApi(page, { comentar: () => ({ status: 401, corpo: { erro: "Token inválido" } }) });

    await page.goto("/catalogo/7");
    await page.getByLabel(/^5 estrelas/).check({ force: true });
    await page.locator("#comment-text").fill("Muito bom, recomendo.");
    await page.getByRole("button", { name: "Publicar" }).click();

    await expect(page.getByRole("heading", { name: "Entre para avaliar" })).toBeVisible();
    await expect(page).toHaveURL(/\/catalogo\/7$/);
    expect(await page.evaluate(() => window.localStorage.getItem("token"))).toBeNull();
  });
});

test.describe("busca automática de especificações", () => {
  test.beforeEach(async ({ page }) => {
    await logar(page);
  });

  test("mostra o saldo de buscas e créditos do mês", async ({ page }) => {
    await mockarApi(page);
    await page.goto("/items/new");
    await expect(page.getByTestId("saldo-busca")).toHaveText(
      "Você tem 1 busca automática hoje · 42 créditos restantes no mês",
    );
    await page.locator("#marca").fill("Samsung");
    await page.locator("#modelo").fill("Galaxy");
    await expect(botaoBuscar(page)).toBeEnabled();
  });

  test("busca de hoje já usada: botão desabilitado e nenhuma busca disparada", async ({ page }) => {
    const chamadas = await mockarApi(page, {
      creditos: () => ({ status: 200, corpo: { restantesMes: 41, restantesHoje: 4, usuarioPodeBuscarHoje: false } }),
    });
    await page.goto("/items/new");
    await expect(page.getByTestId("saldo-busca")).toHaveText(
      "Você já usou a busca automática de hoje · 41 créditos restantes no mês",
    );
    await page.locator("#marca").fill("Samsung");
    await page.locator("#modelo").fill("Galaxy S24");
    await expect(botaoBuscar(page)).toBeDisabled();
    await expect(page.getByText("Busca automática indisponível hoje")).toBeVisible();
    // passa do tempo da busca automática (0,7 s) sem chamar a API
    await page.waitForTimeout(1200);
    expect(chamadas.especificacoes).toBe(0);
    await expect(page.getByRole("button", { name: "Salvar celular" })).toBeEnabled();
  });

  test("429 mostra a mensagem do back e o formulário continua utilizável", async ({ page }) => {
    let usou = false;
    await mockarApi(page, {
      creditos: () => ({ status: 200, corpo: { restantesMes: 40, restantesHoje: 3, usuarioPodeBuscarHoje: !usou } }),
      especificacoes: () => {
        usou = true;
        return { status: 429, corpo: { erro: MSG_429 } };
      },
    });
    await page.goto("/items/new");
    await expect(page.getByTestId("saldo-busca")).toContainText("Você tem 1 busca automática hoje");

    await page.locator("#marca").fill("Samsung");
    await page.locator("#modelo").fill("Galaxy S24");
    await expect(page.getByText(MSG_429)).toBeVisible();
    await expect(page.getByText("Busca automática indisponível hoje")).toBeVisible();
    await expect(botaoBuscar(page)).toBeDisabled();
    // o saldo é consultado de novo depois da busca
    await expect(page.getByTestId("saldo-busca")).toHaveText(
      "Você já usou a busca automática de hoje · 40 créditos restantes no mês",
    );

    // os campos seguem editáveis e dá para salvar
    await page.locator("#descricao").fill("Preenchido à mão");
    await expect(page.locator("#descricao")).toHaveValue("Preenchido à mão");
    await expect(page.getByRole("button", { name: "Salvar celular" })).toBeEnabled();
  });

  test("saldo indisponível (503) não quebra a tela nem bloqueia a busca", async ({ page }) => {
    await mockarApi(page, {
      creditos: () => ({ status: 503, corpo: { erro: "Serviço de especificações indisponível" } }),
    });
    await page.goto("/items/new");
    await expect(page.getByTestId("saldo-busca")).toHaveText("Não foi possível consultar o saldo de buscas agora.");
    await page.locator("#marca").fill("Samsung");
    await page.locator("#modelo").fill("Galaxy");
    await expect(botaoBuscar(page)).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Adicionar celular" })).toBeVisible();
  });
});
