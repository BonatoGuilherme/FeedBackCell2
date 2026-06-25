// CONEXÃO COM BANCO DE DADOS
const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Habilita suporte a Promises no pool
const promisePool = pool.promise();

// Testa conexão ao iniciar
pool.getConnection((err, conn) => {
  if (err) {
    console.error("Erro ao conectar ao MySQL:", err.message);
  } else {
    console.log("✅ Conectado ao MySQL com sucesso!");
    conn.release(); 
  }
});

module.exports = { pool: promisePool };
