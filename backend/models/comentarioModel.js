const { pool } = require("../server");

const comentarioModel = {
  // Buscar todos os comentários de um celular
  getByIdCelular: async (idcelular, page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;
      const [results] = await pool.query(
        `SELECT c.idcomentario, c.texto, c.dataCriacao, u.idusuario, u.Nome 
         FROM Comentarios c 
         JOIN Usuarios u ON c.idusuario = u.idusuario 
         WHERE c.idcelular = ? 
         ORDER BY c.dataCriacao DESC 
         LIMIT ? OFFSET ?`,
        [idcelular, limit, offset]
      );
      return results;
    } catch (error) {
      throw error;
    }
  },

  // Contar comentários de um celular
  getCountByIdCelular: async (idcelular) => {
    try {
      const [results] = await pool.query(
        "SELECT COUNT(*) as total FROM Comentarios WHERE idcelular = ?",
        [idcelular]
      );
      return results[0].total;
    } catch (error) {
      throw error;
    }
  },

  // Criar novo comentário
  create: async (idcelular, idusuario, texto) => {
    try {
      const [results] = await pool.query(
        "INSERT INTO Comentarios (idcelular, idusuario, texto, dataCriacao) VALUES (?, ?, ?, NOW())",
        [idcelular, idusuario, texto]
      );
      return {
        idcomentario: results.insertId,
        idcelular,
        idusuario,
        texto,
      };
    } catch (error) {
      throw error;
    }
  },

  // Deletar comentário
  delete: async (id) => {
    try {
      await pool.query(
        "DELETE FROM Comentarios WHERE idcomentario = ?",
        [id]
      );
      return { mensagem: "Comentário deletado com sucesso" };
    } catch (error) {
      throw error;
    }
  },

  // Buscar comentário por ID (para validação de propriedade)
  getById: async (id) => {
    try {
      const [results] = await pool.query(
        "SELECT * FROM Comentarios WHERE idcomentario = ?",
        [id]
      );
      return results[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Buscar comentários por usuário
  getByUserId: async (idusuario) => {
    try {
      const [results] = await pool.query(
        "SELECT * FROM Comentarios WHERE idusuario = ? ORDER BY dataCriacao DESC",
        [idusuario]
      );
      return results;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = comentarioModel;
