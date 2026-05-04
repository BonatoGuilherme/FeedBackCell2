const Joi = require("joi");

// Schemas de validação para Celulares
const celularSchema = {
  create: Joi.object({
    marca: Joi.string().min(2).max(50).required(),
    modelo: Joi.string().min(2).max(100).required(),
    preco: Joi.number().positive().required(),
    descricao: Joi.string().max(500).optional(),
  }),

  update: Joi.object({
    marca: Joi.string().min(2).max(50).required(),
    modelo: Joi.string().min(2).max(100).required(),
    preco: Joi.number().positive().required(),
    descricao: Joi.string().max(500).optional(),
  }),
};

// Schemas de validação para Comentários
const comentarioSchema = {
  create: Joi.object({
    texto: Joi.string().min(3).max(500).required(),
  }),
};

// Schemas de validação para Usuários
const usuarioSchema = {
  register: Joi.object({
    nome: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    senha: Joi.string().min(6).max(100).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    senha: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    nome: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
  }),

  updatePassword: Joi.object({
    senhaAtual: Joi.string().required(),
    novaSenha: Joi.string().min(6).max(100).required(),
    confirmaSenha: Joi.string()
      .valid(Joi.ref("novaSenha"))
      .required()
      .messages({
        "any.only": "Senhas não conferem",
      }),
  }),

  deleteAccount: Joi.object({
    senha: Joi.string().required(),
  }),
};

module.exports = {
  celularSchema,
  comentarioSchema,
  usuarioSchema,
};
