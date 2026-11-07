const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const schemaPath = path.join(__dirname, "..", "db", "feedbackcell.sql");

test("bootstrap schema uses the database selected by the MySQL entrypoint", () => {
  const schema = readFileSync(schemaPath, "utf8");

  assert.doesNotMatch(schema, /^\s*USE\s+/im);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS `Usuarios`/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS `Celulares`/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS `Comentarios`/);
});
