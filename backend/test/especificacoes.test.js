const assert = require("node:assert/strict");
const test = require("node:test");
const service = require("../services/especificacoesService");
const controller = require("../controllers/especificacoesController");
const { pontuar, melhorCandidato } = require("../services/correspondenciaNome");

const UID = "9e045e469d514fea9dda2ccd161f5fa3";
const UID2 = "1e8fecdb2a1849ec8dad382b73bd39d1";
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function mockFetch(t, handler) {
  const original = global.fetch;
  const chamadas = [];
  global.fetch = async (url, init) => {
    chamadas.push({ url: String(url), init });
    return handler(String(url), init);
  };
  t.after(() => {
    global.fetch = original;
    service.limparCache();
  });
  return chamadas;
}

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("escolhe o aparelho certo entre resultados parecidos e usa cache", async (t) => {
  process.env.MOBILEAPI_KEY = "chave-teste";
  t.after(() => delete process.env.MOBILEAPI_KEY);

  const chamadas = mockFetch(t, (url) => {
    if (url.startsWith("https://api.mobileapi.dev/")) {
      return jsonResponse({
        devices: [
          { name: "GALAXY Note 3 N9006", manufacturer_name: "Samsung" },
          { name: "Galaxy S24 Ultra", manufacturer_name: "Samsung" },
          { name: "Galaxy S24", manufacturer_name: "Samsung", image_b64: PNG_B64, storage: "128 GB, 256 GBBuy memory card", weight: "168.00", thickness: "7.6mm", battery_capacity: 4000 },
        ],
      });
    }
    return jsonResponse({
      results: [
        { uid: UID, name: "IPhone 15 Pro" },
        { uid: UID2, name: "Galaxy S24 Ultra - $20", user: { displayName: "autor" }, thumbnails: { images: [{ url: "https://media.sketchfab.com/t.jpg", width: 640 }] } },
      ],
    });
  });

  const r = await service.buscarEspecificacoes({ marca: "Samsung", modelo: "Galaxy S24" });
  assert.equal(r.aparelho.nome, "Galaxy S24");
  assert.equal(r.aparelho.armazenamento, "128 GB, 256 GB");
  assert.equal(r.aparelho.peso, "168 g");
  assert.equal(r.aparelho.espessura, "7.6mm");
  assert.equal(r.aparelho.bateria, "4000");
  assert.equal(r.aparelho.imagem, `data:image/png;base64,${PNG_B64}`);
  // 3D: aceita a variante próxima quando não existe a exata
  assert.equal(r.modelo3d.embedUrl, `https://sketchfab.com/models/${UID2}/embed`);
  assert.deepEqual(r.avisos, []);

  const mobile = new URL(chamadas.find((c) => c.url.includes("mobileapi")).url);
  assert.equal(mobile.searchParams.get("name"), "Galaxy S24");
  assert.equal(mobile.searchParams.get("manufacturer"), "Samsung");
  assert.equal(chamadas.find((c) => c.url.includes("mobileapi")).init.headers.Authorization, "Token chave-teste");

  await service.buscarEspecificacoes({ marca: "SAMSUNG", modelo: "galaxy s24" });
  const externas = (lista) => lista.filter((c) => !/wiki(pedia|media).org/.test(c.url)).length;
  assert.equal(externas(chamadas), 2, "segunda busca deve vir do cache");
});

test("não mostra especificação de outro aparelho quando não há correspondência", async (t) => {
  process.env.MOBILEAPI_KEY = "x";
  t.after(() => delete process.env.MOBILEAPI_KEY);
  mockFetch(t, (url) =>
    url.includes("mobileapi")
      ? jsonResponse({ devices: [{ name: "GALAXY Note 3 N9006" }, { name: "Galaxy A01 Dual SIM" }] })
      : jsonResponse({ results: [{ uid: UID, name: "IPhone 15 Pro" }] }),
  );

  const r = await service.buscarEspecificacoes({ marca: "Samsung", modelo: "Galaxy S24" });
  assert.equal(r.aparelho, null);
  assert.equal(r.modelo3d, null);
  assert.deepEqual(r.sugestoes, []);
  assert.match(r.avisos[0], /Não encontramos/);
});

test("sem MOBILEAPI_KEY ainda devolve o modelo 3D com aviso", async (t) => {
  delete process.env.MOBILEAPI_KEY;
  mockFetch(t, () => jsonResponse({ results: [{ uid: UID, name: "Galaxy S24" }] }));

  const r = await service.buscarEspecificacoes({ marca: "Samsung", modelo: "Galaxy S24" });
  assert.equal(r.aparelho, null);
  assert.ok(r.modelo3d);
  assert.match(r.avisos[0], /MOBILEAPI_KEY/);
});

test("falha externa não é cacheada e vira aviso", async (t) => {
  process.env.MOBILEAPI_KEY = "x";
  t.after(() => delete process.env.MOBILEAPI_KEY);
  const chamadas = mockFetch(t, (url) => (url.includes("mobileapi") ? jsonResponse({}, 429) : jsonResponse({ results: [] })));

  const r = await service.buscarEspecificacoes({ marca: "Motorola", modelo: "Moto G" });
  assert.equal(r.aparelho, null);
  assert.equal(r.modelo3d, null);
  assert.match(r.avisos[0], /Limite/);
  await service.buscarEspecificacoes({ marca: "Motorola", modelo: "Moto G" });
  assert.equal(chamadas.filter((c) => !/wiki(pedia|media)/.test(c.url)).length, 4);
});

test("ignora uid inválido do Sketchfab", async (t) => {
  delete process.env.MOBILEAPI_KEY;
  mockFetch(t, () => jsonResponse({ results: [{ uid: "../../evil", name: "Xiaomi 14" }] }));
  const r = await service.buscarEspecificacoes({ marca: "Xiaomi", modelo: "14" });
  assert.equal(r.modelo3d, null);
});

test("pontuar exige números e variantes pedidas", () => {
  assert.equal(pontuar("Galaxy S24", "Galaxy Note 3 N9006"), null);
  assert.equal(pontuar("Galaxy S24", "Galaxy S24 Ultra"), null);
  assert.ok(pontuar("Galaxy S24", "Galaxy S24 Ultra", { variantesExtrasPermitidas: true }) !== null);
  assert.equal(pontuar("iPhone 15 Pro", "iPhone 15"), null);
  assert.ok(pontuar("iPhone 15 Pro", "Apple iPhone 15 Pro (5G)") !== null);
  assert.equal(pontuar("Galaxy S24+", "Galaxy S24"), null);
  assert.ok(pontuar("Galaxy S24+", "Galaxy S24 Plus") !== null);
  const lista = [{ n: "Galaxy S24 Ultra" }, { n: "Galaxy S24 Dual SIM" }, { n: "Galaxy S24 FE" }];
  assert.equal(melhorCandidato("Galaxy S24", lista, (i) => i.n, { variantesExtrasPermitidas: true }).n, "Galaxy S24 Dual SIM");
});

test("controller valida marca e modelo", async () => {
  const invalidos = [{}, { modelo: "a" }, { marca: "<b>", modelo: "S24" }, { modelo: "x".repeat(121) }, { marca: "x".repeat(81), modelo: "S24" }];
  for (const query of invalidos) {
    const res = fakeRes();
    await controller.buscar({ query }, res, () => {});
    assert.equal(res.statusCode, 400, JSON.stringify(query));
  }
});

test("imagemDataUri rejeita conteúdo que não é imagem conhecida", () => {
  assert.equal(service.imagemDataUri("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=="), null);
  assert.equal(service.imagemDataUri("data:image/svg+xml;base64,AAAA"), null);
});

test("sugestões do autocomplete aceitam palavra incompleta e variantes", async (t) => {
  process.env.MOBILEAPI_KEY = "x";
  t.after(() => delete process.env.MOBILEAPI_KEY);
  mockFetch(t, (url) =>
    url.includes("mobileapi")
      ? jsonResponse({
          devices: [
            { name: "Galaxy A01 Dual SIM" },
            { name: "Galaxy S24 Ultra" },
            { name: "Galaxy S23" },
            { name: "Galaxy S24" },
          ],
        })
      : jsonResponse({ results: [] }),
  );

  const r = await service.buscarEspecificacoes({ marca: "Samsung", modelo: "Galaxy S2" });
  assert.equal(r.aparelho, null, "sem modelo exato não escolhe um sozinho");
  assert.deepEqual(r.sugestoes.map((s) => s.nome).sort(), ["Galaxy S23", "Galaxy S24", "Galaxy S24 Ultra"]);
  assert.deepEqual(r.avisos, []);
});

test("somente3d não consulta a MobileAPI", async (t) => {
  process.env.MOBILEAPI_KEY = "x";
  t.after(() => delete process.env.MOBILEAPI_KEY);
  const chamadas = mockFetch(t, () => jsonResponse({ results: [{ uid: UID, name: "Galaxy S24 Ultra" }] }));

  const r = await service.buscarEspecificacoes({ marca: "Samsung", modelo: "Galaxy S24 Ultra", somente3d: true });
  assert.equal(chamadas.length, 1);
  assert.ok(chamadas[0].url.includes("sketchfab"));
  assert.ok(r.modelo3d);
});

test("anexa foto em alta resolução da Wikimedia com crédito, só do modelo certo", async (t) => {
  process.env.MOBILEAPI_KEY = "x";
  t.after(() => delete process.env.MOBILEAPI_KEY);
  const THUMB = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/S24.jpg/960px-S24.jpg";
  mockFetch(t, (url) => {
    const u = new URL(url);
    if (u.hostname === "api.mobileapi.dev") {
      return jsonResponse({ devices: [{ name: "Galaxy S24", manufacturer_name: "Samsung" }, { name: "Galaxy S24 Ultra", manufacturer_name: "Samsung" }] });
    }
    if (u.hostname === "en.wikipedia.org" && u.searchParams.get("prop") === "pageimages") {
      // "Samsung Galaxy S24 Ultra" redireciona para o artigo do S24: não pode usar a foto do S24
      return jsonResponse({
        query: {
          redirects: [{ from: "Samsung Galaxy S24 Ultra", to: "Samsung Galaxy S24" }],
          pages: [{ title: "Samsung Galaxy S24", pageimage: "S24.jpg" }],
        },
      });
    }
    if (u.hostname === "en.wikipedia.org" && u.searchParams.get("prop") === "imageinfo") {
      return jsonResponse({
        query: {
          pages: [{
            title: "File:S24.jpg",
            imageinfo: [{
              thumburl: `${THUMB}?utm_source=x`,
              descriptionurl: "https://commons.wikimedia.org/wiki/File:S24.jpg",
              extmetadata: { Artist: { value: '<a href="//x">Fulano</a>' }, LicenseShortName: { value: "CC BY-SA 4.0" } },
            }],
          }],
        },
      });
    }
    if (u.hostname === "commons.wikimedia.org") {
      // a busca no Commons só acha arquivo de outro modelo
      return jsonResponse({ query: { pages: [{ title: "File:Galaxy S23 Ultra.jpg", imageinfo: [{ thumburl: THUMB, width: 2000, height: 4000 }] }] } });
    }
    return jsonResponse({ results: [] });
  });

  const r = await service.buscarEspecificacoes({ marca: "Samsung", modelo: "Galaxy S24" });
  assert.equal(r.aparelho.imagemHd, THUMB, "sem os parâmetros de rastreio");
  assert.equal(r.aparelho.creditoImagem, "Foto: Fulano · CC BY-SA 4.0 · Wikimedia Commons");
  assert.equal(r.aparelho.creditoImagemUrl, "https://commons.wikimedia.org/wiki/File:S24.jpg");
  const ultra = r.sugestoes.find((s) => s.nome === "Galaxy S24 Ultra");
  assert.equal(ultra.imagemHd, null, "não usa a foto do S24 nem a do S23 Ultra para o S24 Ultra");
});

test("se a Wikimedia falhar, segue com a miniatura", async (t) => {
  process.env.MOBILEAPI_KEY = "x";
  t.after(() => delete process.env.MOBILEAPI_KEY);
  mockFetch(t, (url) => {
    if (url.includes("mobileapi")) return jsonResponse({ devices: [{ name: "Galaxy S24", image_b64: PNG_B64 }] });
    if (/wiki(pedia|media)\.org/.test(url)) return jsonResponse({}, 503);
    return jsonResponse({ results: [] });
  });
  const r = await service.buscarEspecificacoes({ marca: "Samsung", modelo: "Galaxy S24" });
  assert.equal(r.aparelho.imagemHd, null);
  assert.equal(r.aparelho.imagem, `data:image/png;base64,${PNG_B64}`);
});

test("sem MobileAPI, ainda devolve a foto HD do modelo digitado (sem especificações)", async (t) => {
  delete process.env.MOBILEAPI_KEY;
  const THUMB = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Pixel_8.jpg/960px-Pixel_8.jpg";
  mockFetch(t, (url) => {
    const u = new URL(url);
    if (u.hostname === "en.wikipedia.org" && u.searchParams.get("prop") === "pageimages") {
      return jsonResponse({ query: { pages: [{ title: "Pixel 8", pageimage: "Pixel_8.jpg" }] } });
    }
    if (u.hostname === "en.wikipedia.org") {
      return jsonResponse({ query: { pages: [{ title: "File:Pixel_8.jpg", imageinfo: [{ thumburl: THUMB }] }] } });
    }
    return jsonResponse({ results: [] });
  });
  const r = await service.buscarEspecificacoes({ marca: "Google", modelo: "Pixel 8" });
  assert.equal(r.aparelho.nome, "Pixel 8");
  assert.equal(r.aparelho.imagemHd, THUMB);
  assert.equal(r.aparelho.tela, null);
});
