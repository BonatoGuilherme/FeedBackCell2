// Middleware de erro centralizado
const errorHandler = (err, req, res, next) => {
  console.error("Erro:", err);

  // Erro de validação
  if (err.status === 400) {
    return res.status(400).json({
      erro: err.message || "Erro de validação",
      status: 400,
    });
  }

  // Erro de autenticação
  if (err.status === 401) {
    return res.status(401).json({
      erro: err.message || "Não autenticado",
      status: 401,
    });
  }

  // Erro de permissão
  if (err.status === 403) {
    return res.status(403).json({
      erro: err.message || "Acesso negado",
      status: 403,
    });
  }

  // Erro não encontrado
  if (err.status === 404) {
    return res.status(404).json({
      erro: err.message || "Recurso não encontrado",
      status: 404,
    });
  }

  // Erro de servidor
  return res.status(err.status || 500).json({
    erro: err.message || "Erro interno do servidor",
    status: err.status || 500,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
