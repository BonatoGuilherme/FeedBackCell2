// DEPENDÊNCIAS
const express = require("express");
const mysql = require("mysql2");
require("dotenv").config();

// INICIALIZAÇÃO DO EXPRESS
const app = express();

// CONFIGURAÇÃO DE PROXY
app.set("trust proxy", 1);

// CONEXÃO COM BANCO DE DADOS
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
    console.log("Conectado ao MySQL com sucesso!");
    conn.release(); 
  }
});

// AGORA importa as rotas
const configMiddlewares = require("./middlewares/config");
const authRoutes = require("./routes/authRoutes");
const celularesRoutes = require("./routes/celularesRoutes");
const usuariosRoutes = require("./routes/usuariosRoutes");
const comentariosRoutes = require("./routes/comentariosRoutes");
const limiter = require("./middlewares/rateLimitMiddleware");
const errorHandler = require("./middlewares/errorHandler");

// MIDDLEWARES
configMiddlewares(app);
app.use(limiter); // Proteção contra abusos globalmente

// ROTAS
app.use("/api/auth", authRoutes);
app.use("/api/celulares", celularesRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/comentarios", comentariosRoutes);

// MIDDLEWARE DE ERRO (Sempre deve ser o último a ser registrado)
app.use(errorHandler);

// INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = { app, pool: promisePool };
