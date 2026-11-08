const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const test = require("node:test");
const authController = require("../controllers/authController");
const authModel = require("../models/authModel");

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

test("login returns the same generic failure for an unknown email and wrong password", async (t) => {
  const originalGetUserByEmail = authModel.getUserByEmail;
  const storedPassword = await bcrypt.hash("correct-password", 4);
  authModel.getUserByEmail = async (email) =>
    email === "known@example.com" ? { Senha: storedPassword } : null;
  t.after(() => {
    authModel.getUserByEmail = originalGetUserByEmail;
  });

  const unknownEmailResponse = createResponse();
  await authController.login(
    { body: { email: "missing@example.com", senha: "wrong-password" } },
    unknownEmailResponse,
  );

  const wrongPasswordResponse = createResponse();
  await authController.login(
    { body: { email: "known@example.com", senha: "wrong-password" } },
    wrongPasswordResponse,
  );

  assert.equal(unknownEmailResponse.statusCode, 401);
  assert.deepEqual(
    {
      statusCode: unknownEmailResponse.statusCode,
      body: unknownEmailResponse.body,
    },
    {
      statusCode: wrongPasswordResponse.statusCode,
      body: wrongPasswordResponse.body,
    },
  );
  assert.deepEqual(unknownEmailResponse.body, {
    erro: "Email ou senha inválidos",
  });
});
