const assert = require("node:assert/strict");
const test = require("node:test");

process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.TRUST_PROXY = "1";
process.env.RATE_LIMIT = "2";
process.env.RATE_LIMIT_WINDOW_MS = "60000";

const { startServer, shutdownServer } = require("./server");
const { pool } = require("./db/connection");
const { closeRateLimitStore } = require("./middlewares/rateLimitMiddleware");

test("integra MySQL, Redis, prontidão, rate limit e ciclo do servidor", async (t) => {
  const server = await startServer();
  t.after(async () => {
    if (server.listening) {
      await shutdownServer(server);
    }
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const readiness = await fetch(`${baseUrl}/readyz`);
  assert.equal(readiness.status, 200);
  assert.deepEqual(await readiness.json(), { status: "ready" });

  const firstRateLimitedRoute = await fetch(`${baseUrl}/auth/verify`);
  const secondRateLimitedRoute = await fetch(`${baseUrl}/auth/verify`);
  const thirdRateLimitedRoute = await fetch(`${baseUrl}/auth/verify`);
  assert.equal(firstRateLimitedRoute.status, 401);
  assert.equal(secondRateLimitedRoute.status, 401);
  assert.equal(thirdRateLimitedRoute.status, 429);

  const originalQuery = pool.query;
  pool.query = async () => {
    throw new Error("Falha de banco simulada no teste");
  };
  try {
    const unavailableDatabaseReadiness = await fetch(`${baseUrl}/readyz`);
    assert.equal(unavailableDatabaseReadiness.status, 503);
  } finally {
    pool.query = originalQuery;
  }

  await closeRateLimitStore();
  const unavailableRedisReadiness = await fetch(`${baseUrl}/readyz`);
  assert.equal(unavailableRedisReadiness.status, 503);

  await shutdownServer(server);
  assert.equal(server.listening, false);
});
