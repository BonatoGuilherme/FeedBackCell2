const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const celularModel = require("../models/celularModel");
const celularImagemModel = require("../models/celularImagemModel");
const { detectarMime } = require("../controllers/celularImagensController");

process.env.JWT_SECRET = process.env.JWT_SECRET || "segredo-de-teste";
const celularesRoutes = require("../routes/celularesRoutes");

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);

function stub(t, obj, key, fn) {
  const original = obj[key];
  obj[key] = fn;
  t.after(() => {
    obj[key] = original;
  });
}

async function startServer(t) {
  const app = express();
  app.use(express.json());
  app.use("/celulares", celularesRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

const tokenFor = (idusuario) =>
  jwt.sign({ idusuario, email: "a@b.com" }, process.env.JWT_SECRET);

test("detectarMime reconhece JPEG, PNG e WebP pela assinatura", () => {
  assert.equal(detectarMime(Buffer.from([0xff, 0xd8, 0xff, ...Array(12).fill(0)])), "image/jpeg");
  assert.equal(detectarMime(PNG), "image/png");
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(4)]);
  assert.equal(detectarMime(webp), "image/webp");
  assert.equal(detectarMime(Buffer.from("<svg onload=alert(1)></svg>")), null);
});

test("POST /celulares/:id/imagens exige token", async (t) => {
  const base = await startServer(t);
  const response = await fetch(`${base}/celulares/1/imagens`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: PNG,
  });
  assert.equal(response.status, 401);
});

test("POST rejeita conteúdo que não é imagem mesmo com Content-Type de imagem", async (t) => {
  const base = await startServer(t);
  const response = await fetch(`${base}/celulares/1/imagens`, {
    method: "POST",
    headers: { "Content-Type": "image/png", Authorization: `Bearer ${tokenFor(1)}` },
    body: Buffer.from("isto não é um png de verdade"),
  });
  assert.equal(response.status, 415);
});

test("POST bloqueia quem não é dono do celular", async (t) => {
  stub(t, celularModel, "getById", async () => ({ idcelular: 1, idusuario: 99 }));
  const base = await startServer(t);
  const response = await fetch(`${base}/celulares/1/imagens`, {
    method: "POST",
    headers: { "Content-Type": "image/png", Authorization: `Bearer ${tokenFor(1)}` },
    body: PNG,
  });
  assert.equal(response.status, 403);
});

test("POST salva a foto do dono e respeita o limite por celular", async (t) => {
  stub(t, celularModel, "getById", async () => ({ idcelular: 1, idusuario: 1 }));
  let total = 0;
  let salvo;
  stub(t, celularImagemModel, "countByCelular", async () => total);
  stub(t, celularImagemModel, "create", async (idcelular, mime, dados, ordem) => {
    salvo = { idcelular, mime, tamanho: dados.length, ordem };
    return { idimagem: 7, mime, tamanho: dados.length, ordem };
  });
  const base = await startServer(t);
  const enviar = () =>
    fetch(`${base}/celulares/1/imagens`, {
      method: "POST",
      headers: { "Content-Type": "image/png", Authorization: `Bearer ${tokenFor(1)}` },
      body: PNG,
    });

  const ok = await enviar();
  assert.equal(ok.status, 201);
  assert.equal((await ok.json()).imagem.url, "/celulares/imagens/7");
  assert.deepEqual(salvo, { idcelular: 1, mime: "image/png", tamanho: PNG.length, ordem: 0 });

  total = 10;
  const cheio = await enviar();
  assert.equal(cheio.status, 409);
});

test("GET /celulares/imagens/:id devolve o binário com o tipo salvo", async (t) => {
  stub(t, celularImagemModel, "getById", async () => ({
    idimagem: 3,
    idcelular: 1,
    mime: "image/png",
    dados: PNG,
  }));
  const base = await startServer(t);
  const response = await fetch(`${base}/celulares/imagens/3`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
});
