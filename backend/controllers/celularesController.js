const celularModel = require("../models/celularModel");

const celularController = {
  // GET - Listar todos os celulares
  getAll: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (page < 1 || limit < 1) {
        return res
          .status(400)
          .json({ erro: "Página e limite devem ser maiores que 0" });
      }

      const celulares = await celularModel.getAll(page, limit);
      const total = await celularModel.getCount();
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        celulares,
        paginacao: {
          paginaAtual: page,
          totalPaginas: totalPages,
          totalItems: total,
          itemsPorPagina: limit,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar celulares:", error);
      return res
        .status(500)
        .json({ erro: "Erro ao buscar celulares" });
    }
  },

  // GET - Buscar celular por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido" });
      }

      const celular = await celularModel.getById(id);
      if (!celular) {
        return res.status(404).json({ erro: "Celular não encontrado" });
      }

      return res.status(200).json(celular);
    } catch (error) {
      console.error("Erro ao buscar celular:", error);
      return res
        .status(500)
        .json({ erro: "Erro ao buscar celular" });
    }
  },

  // POST - Criar novo celular
  create: async (req, res) => {
    try {
      const { marca, modelo, preco, descricao } = req.body;
      const idusuario = req.userId;

      // Validação
      if (!marca || !modelo || preco === undefined) {
        return res.status(400).json({
          erro: "Marca, modelo e preço são obrigatórios",
        });
      }

      if (typeof preco !== "number" || preco < 0) {
        return res
          .status(400)
          .json({ erro: "Preço deve ser um número positivo" });
      }

      if (marca.trim().length < 2 || modelo.trim().length < 2) {
        return res.status(400).json({
          erro: "Marca e modelo devem ter pelo menos 2 caracteres",
        });
      }

      const celular = await celularModel.create(
        marca.trim(),
        modelo.trim(),
        preco,
        descricao ? descricao.trim() : "",
        idusuario,
      );

      return res.status(201).json({
        mensagem: "Celular criado com sucesso",
        celular,
      });
    } catch (error) {
      console.error("Erro ao criar celular:", error);
      return res
        .status(500)
        .json({ erro: "Erro ao criar celular" });
    }
  },

  // PUT - Atualizar celular
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { marca, modelo, preco, descricao } = req.body;
      const idusuario = req.userId;

      if (!id || isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido" });
      }

      // Verifica se celular existe
      const celular = await celularModel.getById(id);
      if (!celular) {
        return res.status(404).json({ erro: "Celular não encontrado" });
      }

      // Verifica propriedade
      if (celular.idusuario !== idusuario) {
        return res.status(403).json({
          erro: "Você não tem permissão para atualizar este celular",
        });
      }

      // Validação
      if (!marca || !modelo || preco === undefined) {
        return res.status(400).json({
          erro: "Marca, modelo e preço são obrigatórios",
        });
      }

      if (typeof preco !== "number" || preco < 0) {
        return res
          .status(400)
          .json({ erro: "Preço deve ser um número positivo" });
      }

      const celularAtualizado = await celularModel.update(
        id,
        marca.trim(),
        modelo.trim(),
        preco,
        descricao ? descricao.trim() : "",
      );

      return res.status(200).json({
        mensagem: "Celular atualizado com sucesso",
        celular: celularAtualizado,
      });
    } catch (error) {
      console.error("Erro ao atualizar celular:", error);
      return res
        .status(500)
        .json({ erro: "Erro ao atualizar celular" });
    }
  },

  // DELETE - Deletar celular
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const idusuario = req.userId;

      if (!id || isNaN(id)) {
        return res.status(400).json({ erro: "ID inválido" });
      }

      // Verifica se celular existe
      const celular = await celularModel.getById(id);
      if (!celular) {
        return res.status(404).json({ erro: "Celular não encontrado" });
      }

      // Verifica propriedade
      if (celular.idusuario !== idusuario) {
        return res.status(403).json({
          erro: "Você não tem permissão para deletar este celular",
        });
      }

      await celularModel.delete(id);

      return res.status(200).json({
        mensagem: "Celular deletado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar celular:", error);
      return res
        .status(500)
        .json({ erro: "Erro ao deletar celular" });
    }
  },

  // GET - Listar celulares do usuário
  getMyItems: async (req, res) => {
    try {
      const idusuario = req.userId;

      const celulares = await celularModel.getByUserId(idusuario);

      return res.status(200).json({
        total: celulares.length,
        celulares,
      });
    } catch (error) {
      console.error("Erro ao buscar celulares do usuário:", error);
      return res.status(500).json({
        erro: "Erro ao buscar seus celulares",
      });
    }
  },
};

module.exports = celularController;
