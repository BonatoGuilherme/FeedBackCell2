const bcrypt = require("bcryptjs");
const usuarioModel = require("../models/usuarioModel");
const { pool } = require("../server");
require("dotenv").config();

const usuarioController = {
  // GET - Buscar perfil do usuário autenticado
  getProfile: async (req, res) => {
    try {
      const idusuario = req.userId;

      const usuario = await usuarioModel.getProfile(idusuario);
      if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      return res.status(200).json(usuario);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      return res.status(500).json({ erro: "Erro ao buscar perfil" });
    }
  },

  // PUT - Atualizar perfil do usuário
  updateProfile: async (req, res) => {
    try {
      const { nome, email } = req.body;
      const idusuario = req.userId;

      // Validação
      if (!nome || !email) {
        return res.status(400).json({
          erro: "Nome e email são obrigatórios",
        });
      }

      if (nome.trim().length < 3) {
        return res.status(400).json({
          erro: "Nome deve ter pelo menos 3 caracteres",
        });
      }

      // Validação de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          erro: "Email inválido",
        });
      }

      const usuarioAtualizado = await usuarioModel.updateProfile(
        idusuario,
        nome.trim(),
        email.trim(),
      );

      return res.status(200).json({
        mensagem: "Perfil atualizado com sucesso",
        usuario: usuarioAtualizado,
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      return res.status(500).json({
        erro: "Erro ao atualizar perfil",
      });
    }
  },

  // PUT - Atualizar senha
  updatePassword: async (req, res) => {
    try {
      const { senhaAtual, novaSenha, confirmaSenha } = req.body;
      const idusuario = req.userId;

      // Validação
      if (!senhaAtual || !novaSenha || !confirmaSenha) {
        return res.status(400).json({
          erro: "Senha atual, nova senha e confirmação são obrigatórias",
        });
      }

      if (novaSenha !== confirmaSenha) {
        return res.status(400).json({
          erro: "Senhas não conferem",
        });
      }

      if (novaSenha.length < 6) {
        return res.status(400).json({
          erro: "Nova senha deve ter pelo menos 6 caracteres",
        });
      }

      // Busca usuário e valida senha atual
      const [results] = await pool.query(
        "SELECT Senha FROM Usuarios WHERE idusuario = ?",
        [idusuario]
      );
      const userWithPassword = results[0];

      if (!userWithPassword) {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      const senhaValida = await bcrypt.compare(senhaAtual, userWithPassword.Senha);
      if (!senhaValida) {
        return res.status(401).json({ erro: "Senha atual incorreta" });
      }

      // Hash nova senha
      const novaSenhaHash = await bcrypt.hash(
        novaSenha,
        parseInt(process.env.BCRYPT_ROUNDS) || 10,
      );

      await usuarioModel.updatePassword(idusuario, novaSenhaHash);

      return res.status(200).json({
        mensagem: "Senha atualizada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      return res.status(500).json({
        erro: "Erro ao atualizar senha",
      });
    }
  },

  // DELETE - Deletar conta
  deleteAccount: async (req, res) => {
    try {
      const { senha } = req.body;
      const idusuario = req.userId;

      if (!senha) {
        return res.status(400).json({
          erro: "Senha é obrigatória para deletar a conta",
        });
      }

      // Busca usuário e valida senha
      const [results] = await pool.query(
        "SELECT Senha FROM Usuarios WHERE idusuario = ?",
        [idusuario]
      );
      const userWithPassword = results[0];

      if (!userWithPassword) {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      const senhaValida = await bcrypt.compare(senha, userWithPassword.Senha);
      if (!senhaValida) {
        return res.status(401).json({ erro: "Senha incorreta" });
      }

      // Deleta usuário
      await usuarioModel.delete(idusuario);

      return res.status(200).json({
        mensagem: "Conta deletada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      return res.status(500).json({
        erro: "Erro ao deletar conta",
      });
    }
  },

  // GET - Listar todos os usuários (apenas admin)
  getAll: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (page < 1 || limit < 1) {
        return res
          .status(400)
          .json({ erro: "Página e limite devem ser maiores que 0" });
      }

      const usuarios = await usuarioModel.getAll(page, limit);
      const total = await usuarioModel.getCount();
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        usuarios,
        paginacao: {
          paginaAtual: page,
          totalPaginas: totalPages,
          totalItems: total,
          itemsPorPagina: limit,
        },
      });
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      return res.status(500).json({
        erro: "Erro ao listar usuários",
      });
    }
  },
};

module.exports = usuarioController;
