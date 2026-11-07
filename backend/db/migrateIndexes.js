const indexes = [
  {
    table: "Celulares",
    name: "idx_celulares_created_id",
    columns: [
      { name: "dataCriacao", direction: "D" },
      { name: "idcelular", direction: "D" },
    ],
    obsolete: [],
  },
  {
    table: "Celulares",
    name: "idx_celulares_usuario_created_id",
    columns: [
      { name: "idusuario", direction: "A" },
      { name: "dataCriacao", direction: "D" },
      { name: "idcelular", direction: "D" },
    ],
    obsolete: ["idx_usuario"],
  },
  {
    table: "Comentarios",
    name: "idx_comentarios_celular_created_id",
    columns: [
      { name: "idcelular", direction: "A" },
      { name: "dataCriacao", direction: "D" },
      { name: "idcomentario", direction: "D" },
    ],
    obsolete: ["idx_celular"],
  },
  {
    table: "Comentarios",
    name: "idx_comentarios_usuario_created_id",
    columns: [
      { name: "idusuario", direction: "A" },
      { name: "dataCriacao", direction: "D" },
      { name: "idcomentario", direction: "D" },
    ],
    obsolete: ["idx_usuario"],
  },
];

function getIndexColumns(rows, indexName) {
  return rows
    .filter((row) => row.INDEX_NAME === indexName)
    .sort((left, right) => left.SEQ_IN_INDEX - right.SEQ_IN_INDEX)
    .map((row) => ({
      name: row.COLUMN_NAME,
      direction: row.COLLATION,
    }));
}

function matchesColumns(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every(
      (column, index) =>
        column.name === expected[index].name &&
        column.direction === expected[index].direction,
    )
  );
}

async function migrateIndexes(database) {
  const queryDatabase = database || require("./connection").pool;
  const indexesByTable = new Map();

  for (const { table } of indexes) {
    if (indexesByTable.has(table)) {
      continue;
    }

    const [rows] = await queryDatabase.query(
      `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, COLLATION
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table],
    );
    indexesByTable.set(table, rows);
  }

  for (const index of indexes) {
    const tableIndexes = indexesByTable.get(index.table);
    const existing = tableIndexes.some(
      (row) => row.INDEX_NAME === index.name,
    );

    if (existing) {
      const actualColumns = getIndexColumns(tableIndexes, index.name);
      if (!matchesColumns(actualColumns, index.columns)) {
        throw new Error(
          `Index ${index.table}.${index.name} exists with unexpected columns`,
        );
      }
      continue;
    }

    const columns = index.columns
      .map(({ name, direction }) => `\`${name}\` ${direction === "D" ? "DESC" : "ASC"}`)
      .join(", ");
    await queryDatabase.query(
      `CREATE INDEX \`${index.name}\` ON \`${index.table}\` (${columns})`,
    );
    console.log(`Migração do banco: índice ${index.name} criado.`);
    index.columns.forEach((column, position) => {
      tableIndexes.push({
        INDEX_NAME: index.name,
        SEQ_IN_INDEX: position + 1,
        COLUMN_NAME: column.name,
        COLLATION: column.direction,
      });
    });
  }

  for (const index of indexes) {
    const tableIndexes = indexesByTable.get(index.table);

    for (const obsoleteName of index.obsolete) {
      if (!tableIndexes.some((row) => row.INDEX_NAME === obsoleteName)) {
        continue;
      }

      await queryDatabase.query(
        `DROP INDEX \`${obsoleteName}\` ON \`${index.table}\``,
      );
      console.log(`Migração do banco: índice redundante ${obsoleteName} removido de ${index.table}.`);
      for (let position = tableIndexes.length - 1; position >= 0; position -= 1) {
        if (tableIndexes[position].INDEX_NAME === obsoleteName) {
          tableIndexes.splice(position, 1);
        }
      }
    }
  }
}

module.exports = migrateIndexes;
