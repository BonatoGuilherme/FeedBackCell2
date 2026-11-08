const assert = require("node:assert/strict");
const test = require("node:test");
const celularController = require("../controllers/celularesController");
const celularModel = require("../models/celularModel");

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("getAll applies default pagination and returns pagination metadata", async (t) => {
  const originalGetAll = celularModel.getAll;
  const originalGetCount = celularModel.getCount;
  const celulares = [{ idcelular: 1 }];
  let receivedPagination;
  celularModel.getAll = async (page, limit) => {
    receivedPagination = { page, limit };
    return celulares;
  };
  celularModel.getCount = async () => 1;
  t.after(() => {
    celularModel.getAll = originalGetAll;
    celularModel.getCount = originalGetCount;
  });

  const response = createResponse();
  await celularController.getAll({ query: {} }, response);

  assert.deepEqual(receivedPagination, { page: 1, limit: 10 });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    celulares,
    paginacao: {
      paginaAtual: 1,
      totalPaginas: 1,
      totalItems: 1,
      itemsPorPagina: 10,
    },
  });
});

test("getAll rejects invalid pagination before querying the model", async (t) => {
  const originalGetAll = celularModel.getAll;
  celularModel.getAll = async () => {
    assert.fail("The model should not be queried for invalid pagination");
  };
  t.after(() => {
    celularModel.getAll = originalGetAll;
  });

  const response = createResponse();
  await celularController.getAll({ query: { limit: "101" } }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    erro: "Página e limite devem ser inteiros positivos; limite máximo: 100",
  });
});