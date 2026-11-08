const Joi = require("joi");

// Especificações vindas da busca (MobileAPI): só campos conhecidos e textos curtos.
const CAMPOS_ESPECIFICACOES = [
  "nome", "fabricante", "lancamento", "tela", "hardware", "armazenamento",
  "camera", "bateria", "peso", "espessura", "cores",
];
const especificacoesSchema = Joi.object({
  ...Object.fromEntries(CAMPOS_ESPECIFICACOES.map((campo) => [campo, Joi.string().max(300).allow(null, "")])),
  // crédito da foto em alta resolução (licença do Wikimedia Commons exige atribuição)
  creditoImagem: Joi.string().max(300).allow(null, ""),
  creditoImagemUrl: Joi.string()
    .max(500)
    .pattern(/^https:\/\/commons\.wikimedia\.org\/wiki\//)
    .allow(null, ""),
}).allow(null);
const modelo3dSchema = Joi.string().pattern(/^[0-9a-f]{32}$/).allow(null);

// Schemas de validação para Celulares
const celularSchema = {
  create: Joi.object({
    marca: Joi.string().min(2).max(100).required(),
    modelo: Joi.string().min(2).max(100).required(),
    preco: Joi.number().min(0).max(99999999.99).required(),
    descricao: Joi.string().max(500).allow("").optional(),
    especificacoes: especificacoesSchema.optional(),
    modelo3d: modelo3dSchema.optional(),
  }),

  update: Joi.object({
    marca: Joi.string().min(2).max(100).required(),
    modelo: Joi.string().min(2).max(100).required(),
    preco: Joi.number().min(0).max(99999999.99).required(),
    descricao: Joi.string().max(500).allow("").optional(),
    especificacoes: especificacoesSchema.optional(),
    modelo3d: modelo3dSchema.optional(),
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
