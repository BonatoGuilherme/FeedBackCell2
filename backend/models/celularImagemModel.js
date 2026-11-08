const { pool } = require("../db/connection");

const celularImagemModel = {
  countByCelular: async (idcelular) => {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS total FROM CelularImagens WHERE idcelular = ?",
      [idcelular],
    );
    return Number(rows[0].total);
  },

  listByCelular: async (idcelular) => {
    const [rows] = await pool.query(
      `SELECT idimagem, mime, tamanho, ordem
       FROM CelularImagens
       WHERE idcelular = ?
       ORDER BY ordem, idimagem`,
      [idcelular],
    );
    return rows;
  },

  // ids das imagens de vários celulares de uma vez (para a listagem)
  idsByCelulares: async (ids) => {
    if (ids.length === 0) return new Map();
    const [rows] = await pool.query(
      `SELECT idcelular, idimagem
       FROM CelularImagens
       WHERE idcelular IN (?)
       ORDER BY idcelular, ordem, idimagem`,
      [ids],
    );
    const map = new Map();
    for (const { idcelular, idimagem } of rows) {
      if (!map.has(idcelular)) map.set(idcelular, []);
      map.get(idcelular).push(idimagem);
    }
    return map;
  },

  getById: async (idimagem) => {
    const [rows] = await pool.query(
      "SELECT idimagem, idcelular, mime, dados FROM CelularImagens WHERE idimagem = ?",
      [idimagem],
    );
    return rows[0] || null;
  },

  create: async (idcelular, mime, dados, ordem) => {
    const [result] = await pool.query(
      `INSERT INTO CelularImagens (idcelular, mime, tamanho, dados, ordem)
       VALUES (?, ?, ?, ?, ?)`,
      [idcelular, mime, dados.length, dados, ordem],
    );
    return { idimagem: result.insertId, mime, tamanho: dados.length, ordem };
  },

  delete: async (idimagem, idcelular) => {
    const [result] = await pool.query(
      "DELETE FROM CelularImagens WHERE idimagem = ? AND idcelular = ?",
      [idimagem, idcelular],
    );
    return result.affectedRows > 0;
  },
};

module.exports = celularImagemModel;
