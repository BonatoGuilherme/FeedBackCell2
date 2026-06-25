// DEPENDÊNCIAS
const express = require("express");
require("dotenv").config();

// INICIALIZAÇÃO DO EXPRESS
const app = express();

// CONFIGURAÇÃO DE PROXY
app.set("trust proxy", 1);

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

// HEALTH CHECK - sem autenticação (para Docker healthcheck)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ROTAS
app.use("/auth", authRoutes);
app.use("/celulares", celularesRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/comentarios", comentariosRoutes);

// MIDDLEWARE DE ERRO (Sempre deve ser o último a ser registrado)
app.use(errorHandler);

// INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = { app };
