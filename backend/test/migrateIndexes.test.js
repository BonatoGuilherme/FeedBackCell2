const assert = require("node:assert/strict");
const test = require("node:test");
const migrateIndexes = require("../db/migrateIndexes");

function createDatabase(initialIndexes) {
  const indexes = new Map(
    Object.entries(initialIndexes).map(([table, tableIndexes]) => [
      table,
      tableIndexes.map((index) => ({
        INDEX_NAME: index.name,
        COLUMN_NAME: index.column,
        SEQ_IN_INDEX: 1,
        COLLATION: "A",
      })),
    ]),
  );
  const statements = [];

  return {
    statements,
    async query(sql, values = []) {
      statements.push(sql);

      if (sql.includes("INFORMATION_SCHEMA.STATISTICS")) {
        return [
          (indexes.get(values[0]) || []).map((row) => ({ ...row })),
        ];
      }

      const createMatch = sql.match(
        /^CREATE INDEX `([^`]+)` ON `([^`]+)` \((.+)\)$/,
      );
      if (createMatch) {
        const [, name, table, definition] = createMatch;
        const columns = [...definition.matchAll(/`([^`]+)` (ASC|DESC)/g)];
        const tableIndexes = indexes.get(table) || [];
        columns.forEach((column, position) => {
          tableIndexes.push({
            INDEX_NAME: name,
            COLUMN_NAME: column[1],
            SEQ_IN_INDEX: position + 1,
            COLLATION: column[2] === "DESC" ? "D" : "A",
          });
        });
        indexes.set(table, tableIndexes);
        return [{ affectedRows: 0 }];
      }

      const dropMatch = sql.match(/^DROP INDEX `([^`]+)` ON `([^`]+)`$/);
      if (dropMatch) {
        const [, name, table] = dropMatch;
        indexes.set(
          table,
          (indexes.get(table) || []).filter((row) => row.INDEX_NAME !== name),
        );
        return [{ affectedRows: 0 }];
      }

      throw new Error(`Unexpected SQL in migration test: ${sql}`);
    },
  };
}

test("creates ordered composite indexes before removing redundant indexes", async () => {
  const database = createDatabase({
    Celulares: [{ name: "idx_usuario", column: "idusuario" }],
    Comentarios: [
      { name: "idx_usuario", column: "idusuario" },
      { name: "idx_celular", column: "idcelular" },
    ],
  });

  await migrateIndexes(database);

  const statements = database.statements;
  const createStatements = statements.filter((sql) =>
    sql.startsWith("CREATE INDEX"),
  );
  const dropStatements = statements.filter((sql) =>
    sql.startsWith("DROP INDEX"),
  );

  assert.equal(createStatements.length, 4);
  assert.equal(dropStatements.length, 3);
  assert.ok(
    statements.indexOf(createStatements.at(-1)) <
      statements.indexOf(dropStatements[0]),
  );

  const statementCount = statements.length;
  await migrateIndexes(database);
  assert.equal(statements.length - statementCount, 2);
});

test("refuses to reuse a composite index name with a different definition", async () => {
  const database = createDatabase({
    Celulares: [{ name: "idx_celulares_created_id", column: "dataCriacao" }],
  });

  await assert.rejects(
    migrateIndexes(database),
    /exists with unexpected columns/,
  );
  assert.equal(
    database.statements.some((sql) => sql.startsWith("DROP INDEX")),
    false,
  );
});
