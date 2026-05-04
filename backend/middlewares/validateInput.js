// Middleware de validação de inputs
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        erro: "Validação falhou",
        detalhes: messages,
      });
    }

    req.body = value;
    next();
  };
};

module.exports = validateInput;
