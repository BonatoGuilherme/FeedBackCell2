const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const celularesRoutes = require("../routes/celularesRoutes");

test("GET /celulares/meus-itens reaches authentication before the ID route", async (t) => {
  const app = express();
  app.use("/celulares", celularesRoutes);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/celulares/meus-itens`);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { erro: "Token não fornecido" });
});
