const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authModel = require("../models/authModel");
require("dotenv").config();

const authController = {
  // REGISTRO - criar novo usuário
  register: async (req, res) => {
    try {
      const { nome, email, senha } = req.body;

      // Validação básica
      if (!nome || !email || !senha) {
        return res
          .status(400)
          .json({ erro: "Nome, email e senha são obrigatórios" });
      }

      // Verifica se email já existe
      const emailJaExiste = await authModel.emailExists(email);
      if (emailJaExiste) {
        return res.status(409).json({ erro: "Email já cadastrado" });
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(
        senha,
        parseInt(process.env.BCRYPT_ROUNDS) || 10,
      );

      // Cria usuário no banco
      const usuario = await authModel.createUser(nome, email, senhaHash);

      return res.status(201).json({
        mensagem: "Usuário registrado com sucesso",
        usuario,
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      return res.status(500).json({ erro: "Erro ao registrar usuário" });
    }
  },

  // LOGIN - autenticar e gerar token
  login: async (req, res) => {
    try {
      const { email, senha } = req.body;

      // Validação básica
      if (!email || !senha) {
        return res.status(400).json({ erro: "Email e senha são obrigatórios" });
      }

      // Busca usuário no banco
      const usuario = await authModel.getUserByEmail(email);
      if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      // Compara senha com hash
      const senhaValida = await bcrypt.compare(senha, usuario.Senha);
      if (!senhaValida) {
        return res.status(401).json({ erro: "Senha incorreta" });
      }

      // Gera token JWT
      const token = jwt.sign(
        { idusuario: usuario.idusuario, email: usuario.Email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION || "24h" },
      );

      return res.status(200).json({
        mensagem: "Login realizado com sucesso",
        token,
        usuario: {
          idusuario: usuario.idusuario,
          nome: usuario.Nome,
          email: usuario.Email,
        },
      });
    } catch (error) {
      console.error("Erro no login:", error);
      return res.status(500).json({ erro: "Erro ao fazer login" });
    }
  },

  // LOGOUT - invalidar sessão
  logout: async (req, res) => {
    try {
      // Com JWT, o logout é feito principalmente no lado do cliente
      // removendo o token do LocalStorage/Cookie.
      return res.status(200).json({ mensagem: "Logout realizado com sucesso no cliente" });
    } catch (error) {
      console.error("Erro no logout:", error);
      return res.status(500).json({ erro: "Erro ao fazer logout" });
    }
  },

  // VERIFY - verificar token e retornar dados do usuário
  verify: async (req, res) => {
    try {
      // Extrai token do header Authorization
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ erro: "Token não fornecido" });
      }

      // Verifica token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Busca dados atualizados do usuário
      const usuario = await authModel.getUserById(decoded.idusuario);
      if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      return res.status(200).json({
        mensagem: "Token válido",
        usuario,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ erro: "Token expirado" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ erro: "Token inválido" });
      }
      console.error("Erro na verificação:", error);
      return res.status(500).json({ erro: "Erro ao verificar token" });
    }
  },
};

module.exports = authController;
