require("../config/loadEnv");

const { pool } = require("./connection");
const migrateCelulares = require("./migrateCelulares");
const migrateIndexes = require("./migrateIndexes");
const migrateImagens = require("./migrateImagens");

async function runMigrations() {
  try {
    await migrateCelulares();
    await migrateIndexes();
    await migrateImagens();
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
