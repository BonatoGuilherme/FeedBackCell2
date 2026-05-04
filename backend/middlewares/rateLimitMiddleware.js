// Middleware de Rate Limiting simples (em memória)
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT) || 100, // limite de requests
  message: "Muitas requisições, tente novamente mais tarde",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Não aplicar rate limit a requisições GET públicas
    return req.method === "GET" && !req.headers.authorization;
  },
});

module.exports = limiter;
