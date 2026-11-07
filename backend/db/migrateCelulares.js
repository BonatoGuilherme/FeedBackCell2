const { pool } = require("./connection");

const requiredColumns = {
  Marca: "VARCHAR(100) NOT NULL DEFAULT 'Não informada' AFTER idusuario",
  Preco: "DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER Modelo",
};

async function migrateCelulares() {
  const [existingColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Celulares'`,
  );
  const existingColumnNames = new Set(
    existingColumns.map(({ COLUMN_NAME }) => COLUMN_NAME.toLowerCase()),
  );

  for (const [columnName, definition] of Object.entries(requiredColumns)) {
    if (!existingColumnNames.has(columnName.toLowerCase())) {
      await pool.query(
        `ALTER TABLE Celulares ADD COLUMN ${columnName} ${definition}`,
      );
      console.log(`Migração do banco: coluna ${columnName} adicionada.`);
    }
  }
}

module.exports = migrateCelulares;
