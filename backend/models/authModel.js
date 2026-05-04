const { pool } = require("../server.js");

const authModel = {
  // Buscar usuário por email
  getUserByEmail: async (email) => {
    try {
      const [results] = await pool.query(
        "SELECT * FROM Usuarios WHERE Email = ?",
        [email]
      );
      return results[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Buscar usuário por ID
  getUserById: async (id) => {
    try {
      const [results] = await pool.query(
        "SELECT idusuario, Nome, Email FROM Usuarios WHERE idusuario = ?",
        [id]
      );
      return results[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Criar novo usuário
  createUser: async (nome, email, senha) => {
    try {
      const [results] = await pool.query(
        "INSERT INTO Usuarios (Nome, Email, Senha) VALUES (?, ?, ?)",
        [nome, email, senha]
      );
      return { idusuario: results.insertId, nome, email };
    } catch (error) {
      throw error;
    }
  },

  // Verificar se email já existe
  emailExists: async (email) => {
    try {
      const [results] = await pool.query(
        "SELECT idusuario FROM Usuarios WHERE Email = ?",
        [email]
      );
      return results.length > 0;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = authModel;
