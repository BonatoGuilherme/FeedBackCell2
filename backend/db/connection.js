// CONEXÃO COM BANCO DE DADOS
const mysql = require("mysql2");
require("dotenv").config();

const connectionLimit = Number(process.env.DB_POOL_SIZE || 10);
if (!Number.isSafeInteger(connectionLimit) || connectionLimit < 1) {
  throw new Error("DB_POOL_SIZE must be a positive integer");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0
});

// Habilita suporte a Promises no pool
const promisePool = pool.promise();

// Testa conexão ao iniciar
pool.getConnection((err, conn) => {
  if (err) {
    console.error("Erro ao conectar ao MySQL:", err.message);
  } else {
    console.log("Conectado ao MySQL com sucesso!");
    conn.release(); 
  }
});

module.exports = { pool: promisePool };
