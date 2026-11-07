const assert = require("node:assert/strict");
const test = require("node:test");
const validateInput = require("../middlewares/validateInput");
const { celularSchema, comentarioSchema } = require("../middlewares/schemas");

function createResponse() {
  return {
    statusCode: undefined,
    body: undefined,
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

test("phone schema accepts zero price and model names up to 100 characters", () => {
  const { error, value } = celularSchema.create.validate({
    marca: "Marca",
    modelo: "M".repeat(100),
    preco: 0,
    descricao: "",
  });

  assert.equal(error, undefined);
  assert.equal(value.preco, 0);
  assert.equal(value.modelo.length, 100);
});

test("validation middleware returns field errors and does not call next for invalid input", () => {
  const response = createResponse();
  let nextCalled = false;

  validateInput(comentarioSchema.create)(
    { body: { texto: "x", extra: true } },
    response,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.erro, "Validação falhou");
  assert.equal(nextCalled, false);
});

test("validation middleware replaces request body with validated known fields", () => {
  const response = createResponse();
  const request = { body: { texto: "Comentário válido", extra: true } };
  let nextCalled = false;

  validateInput(comentarioSchema.create)(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(request.body, { texto: "Comentário válido" });
});
