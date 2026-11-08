const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const comentariosRoutes = require("../routes/comentariosRoutes");
const comentariosController = require("../controllers/comentariosController");
const comentarioModel = require("../models/comentarioModel");

test("GET /comentarios/:idcelular reaches controller parameter validation", async (t) => {
  const app = express();
  app.use("/comentarios", comentariosRoutes);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const response = await fetch(
    `http://127.0.0.1:${port}/comentarios/not-a-number`,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { erro: "ID do celular inválido" });
});

test("DELETE does not delete a comment through a different phone URL", async (t) => {
  const originalGetById = comentarioModel.getById;
  const originalDelete = comentarioModel.delete;
  comentarioModel.getById = async () => ({ idcelular: 2, idusuario: 7 });
  comentarioModel.delete = async () => {
    assert.fail("A comment belonging to another phone must not be deleted");
  };
  t.after(() => {
    comentarioModel.getById = originalGetById;
    comentarioModel.delete = originalDelete;
  });

  const response = {
    statusCode: 200,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await comentariosController.delete(
    { params: { idcelular: "1", idcomentario: "4" }, userId: 7 },
    response,
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { erro: "Comentário não encontrado" });
});
