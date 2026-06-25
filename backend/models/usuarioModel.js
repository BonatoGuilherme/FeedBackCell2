const { pool } = require("../db/connection");

const usuarioModel = {
  // Buscar perfil do usuário
  getProfile: async (id) => {
    try {
      const [results] = await pool.query(
        "SELECT idusuario, Nome, Email, dataCriacao FROM Usuarios WHERE idusuario = ?",
        [id]
      );
      return results[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Atualizar perfil do usuário
  updateProfile: async (id, nome, email) => {
    try {
      await pool.query(
        "UPDATE Usuarios SET Nome = ?, Email = ? WHERE idusuario = ?",
        [nome, email, id]
      );
      return { idusuario: id, Nome: nome, Email: email };
    } catch (error) {
      throw error;
    }
  },

  // Atualizar senha
  updatePassword: async (id, novaSenha) => {
    try {
      await pool.query(
        "UPDATE Usuarios SET Senha = ? WHERE idusuario = ?",
        [novaSenha, id]
      );
      return { mensagem: "Senha atualizada com sucesso" };
    } catch (error) {
      throw error;
    }
  },

  // Deletar usuário
  delete: async (id) => {
    try {
      await pool.query(
        "DELETE FROM Usuarios WHERE idusuario = ?",
        [id]
      );
      return { mensagem: "Usuário deletado com sucesso" };
    } catch (error) {
      throw error;
    }
  },

  // Buscar todos os usuários (admin only)
  getAll: async (page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;
      const [results] = await pool.query(
        "SELECT idusuario, Nome, Email, dataCriacao FROM Usuarios LIMIT ? OFFSET ?",
        [limit, offset]
      );
      return results;
    } catch (error) {
      throw error;
    }
  },

  // Contar total de usuários
  getCount: async () => {
    try {
      const [results] = await pool.query(
        "SELECT COUNT(*) as total FROM Usuarios"
      );
      return results[0].total;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = usuarioModel;
