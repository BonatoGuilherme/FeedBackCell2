const { pool } = require("../server");

const celularModel = {
  // Buscar todos os celulares com paginação
  getAll: async (page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;
      const [results] = await pool.query(
        "SELECT * FROM Celulares ORDER BY dataCriacao DESC LIMIT ? OFFSET ?",
        [limit, offset]
      );
      return results;
    } catch (error) {
      throw error;
    }
  },

  // Contar total de celulares
  getCount: async () => {
    try {
      const [results] = await pool.query(
        "SELECT COUNT(*) as total FROM Celulares"
      );
      return results[0].total;
    } catch (error) {
      throw error;
    }
  },

  // Buscar celular por ID
  getById: async (id) => {
    try {
      const [results] = await pool.query(
        "SELECT * FROM Celulares WHERE idcelular = ?",
        [id]
      );
      return results[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Criar novo celular
  create: async (marca, modelo, preco, descricao, idusuario) => {
    try {
      const [results] = await pool.query(
        "INSERT INTO Celulares (marca, modelo, preco, descricao, idusuario, dataCriacao) VALUES (?, ?, ?, ?, ?, NOW())",
        [marca, modelo, preco, descricao, idusuario]
      );
      return {
        idcelular: results.insertId,
        marca,
        modelo,
        preco,
        descricao,
        idusuario,
      };
    } catch (error) {
      throw error;
    }
  },

  // Atualizar celular
  update: async (id, marca, modelo, preco, descricao) => {
    try {
      await pool.query(
        "UPDATE Celulares SET marca = ?, modelo = ?, preco = ?, descricao = ? WHERE idcelular = ?",
        [marca, modelo, preco, descricao, id]
      );
      return {
        idcelular: id,
        marca,
        modelo,
        preco,
        descricao,
      };
    } catch (error) {
      throw error;
    }
  },

  // Deletar celular
  delete: async (id) => {
    try {
      await pool.query(
        "DELETE FROM Celulares WHERE idcelular = ?",
        [id]
      );
      return { mensagem: "Celular deletado com sucesso" };
    } catch (error) {
      throw error;
    }
  },

  // Buscar celulares por usuário
  getByUserId: async (idusuario) => {
    try {
      const [results] = await pool.query(
        "SELECT * FROM Celulares WHERE idusuario = ? ORDER BY dataCriacao DESC",
        [idusuario]
      );
      return results;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = celularModel;
