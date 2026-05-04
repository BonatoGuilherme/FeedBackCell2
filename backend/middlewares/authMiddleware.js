const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = (req, res, next) => {
  try {
    // Extrai token do header Authorization
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ erro: "Token não fornecido" });
    }

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Armazena o ID do usuário no objeto request
    req.userId = decoded.idusuario;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Token expirado" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ erro: "Token inválido" });
    }
    console.error("Erro na autenticação:", error);
    return res.status(500).json({ erro: "Erro ao verificar autenticação" });
  }
};

module.exports = authMiddleware;
