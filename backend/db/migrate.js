require("dotenv").config();

const { pool } = require("./connection");
const migrateCelulares = require("./migrateCelulares");
const migrateIndexes = require("./migrateIndexes");

async function runMigrations() {
  try {
    await migrateCelulares();
    await migrateIndexes();
    console.log("Migrações do banco concluídas.");
  } catch (error) {
    console.error("Erro ao aplicar migrações do banco:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error("Erro ao encerrar o processo de migração:", error);
  process.exitCode = 1;
});
