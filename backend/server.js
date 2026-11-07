require("dotenv").config();

const express = require("express");
const { pool } = require("./db/connection");
const configMiddlewares = require("./middlewares/config");
const authRoutes = require("./routes/authRoutes");
const celularesRoutes = require("./routes/celularesRoutes");
const usuariosRoutes = require("./routes/usuariosRoutes");
const comentariosRoutes = require("./routes/comentariosRoutes");
const {
  limiter,
  connectRateLimitStore,
  initializeRateLimiter,
  closeRateLimitStore,
  isRateLimitStoreReady,
} = require("./middlewares/rateLimitMiddleware");
const errorHandler = require("./middlewares/errorHandler");

const trustProxyHops = Number(process.env.TRUST_PROXY ?? 1);
if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY must be a non-negative integer");
}

const app = express();
app.set("trust proxy", trustProxyHops);
configMiddlewares(app);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/readyz", async (req, res) => {
  try {
    if (!isRateLimitStoreReady()) {
      return res.status(503).json({ status: "unavailable" });
    }

    await pool.query("SELECT 1");
    return res.status(200).json({ status: "ready" });
  } catch (error) {
    console.error("Verificação de prontidão falhou:", error);
    return res.status(503).json({ status: "unavailable" });
  }
});

app.use(limiter);
app.use("/auth", authRoutes);
app.use("/celulares", celularesRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/comentarios", comentariosRoutes);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectRateLimitStore();
  initializeRateLimiter();

  const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`Recebido ${signal}; encerrando servidor.`);
    server.close(async (error) => {
      if (error) {
        console.error("Erro ao encerrar o servidor HTTP:", error);
        process.exitCode = 1;
      }

      try {
        await Promise.all([pool.end(), closeRateLimitStore()]);
      } catch (shutdownError) {
        console.error("Erro ao encerrar conexões:", shutdownError);
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Erro ao iniciar backend:", error);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
