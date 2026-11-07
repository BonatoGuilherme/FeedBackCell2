const comentarioModel = require("../models/comentarioModel");
const celularModel = require("../models/celularModel");
const { MAX_PAGE_SIZE, parsePagination } = require("../utils/pagination");

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const comentarioController = {
  // GET - Listar comentários de um celular
  getByIdCelular: async (req, res) => {
    try {
      const { idcelular } = req.params;
      const pagination = parsePagination(req.query);
      const celularId = parseId(idcelular);

      if (celularId === null) {
        return res.status(400).json({ erro: "ID do celular inválido" });
      }

      if (!pagination) {
        return res
          .status(400)
          .json({
            erro: `Página e limite devem ser inteiros positivos; limite máximo: ${MAX_PAGE_SIZE}`,
          });
      }

      const { page, limit } = pagination;
      // Verifica se celular existe
      const celular = await celularModel.getById(celularId);
      if (!celular) {
        return res.status(404).json({ erro: "Celular não encontrado" });
      }

      const comentarios = await comentarioModel.getByIdCelular(
        celularId,
        page,
        limit,
      );
      const total = await comentarioModel.getCountByIdCelular(celularId);
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        comentarios,
        paginacao: {
          paginaAtual: page,
          totalPaginas: totalPages,
          totalItems: total,
          itemsPorPagina: limit,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
      return res.status(500).json({
        erro: "Erro ao buscar comentários",
      });
    }
  },

  // POST - Criar novo comentário
  create: async (req, res) => {
    try {
      const { idcelular } = req.params;
      const { texto } = req.body;
      const idusuario = req.userId;
      const celularId = parseId(idcelular);

      // Validação
      if (celularId === null) {
        return res.status(400).json({ erro: "ID do celular inválido" });
      }

      if (!texto || texto.trim().length === 0) {
        return res.status(400).json({ erro: "Texto do comentário é obrigatório" });
      }

      if (texto.trim().length < 3) {
        return res.status(400).json({
          erro: "Comentário deve ter pelo menos 3 caracteres",
        });
      }

      if (texto.trim().length > 500) {
        return res.status(400).json({
          erro: "Comentário não pode ter mais de 500 caracteres",
        });
      }

      // Verifica se celular existe
      const celular = await celularModel.getById(celularId);
      if (!celular) {
        return res.status(404).json({ erro: "Celular não encontrado" });
      }

      const comentario = await comentarioModel.create(
        celularId,
        idusuario,
        texto.trim(),
      );

      return res.status(201).json({
        mensagem: "Comentário criado com sucesso",
        comentario,
      });
    } catch (error) {
      console.error("Erro ao criar comentário:", error);
      return res.status(500).json({
        erro: "Erro ao criar comentário",
      });
    }
  },

  // DELETE - Deletar comentário
  delete: async (req, res) => {
    try {
      const { idcelular, idcomentario } = req.params;
      const idusuario = req.userId;
      const celularId = parseId(idcelular);
      const comentarioId = parseId(idcomentario);

      if (celularId === null) {
        return res.status(400).json({ erro: "ID do celular inválido" });
      }
      if (comentarioId === null) {
        return res.status(400).json({ erro: "ID do comentário inválido" });
      }

      // Verifica se comentário existe
      const comentario = await comentarioModel.getById(comentarioId);
      if (!comentario) {
        return res.status(404).json({ erro: "Comentário não encontrado" });
      }

      if (Number(comentario.idcelular) !== celularId) {
        return res.status(404).json({ erro: "Comentário não encontrado" });
      }

      // Verifica propriedade
      if (Number(comentario.idusuario) !== Number(idusuario)) {
        return res.status(403).json({
          erro: "Você não tem permissão para deletar este comentário",
        });
      }

      await comentarioModel.delete(comentarioId);

      return res.status(200).json({
        mensagem: "Comentário deletado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar comentário:", error);
      return res.status(500).json({
        erro: "Erro ao deletar comentário",
      });
    }
  },

  // GET - Listar comentários do usuário
  getMyComments: async (req, res) => {
    try {
      const idusuario = req.userId;

      const comentarios = await comentarioModel.getByUserId(idusuario);

      return res.status(200).json({
        total: comentarios.length,
        comentarios,
      });
    } catch (error) {
      console.error("Erro ao buscar comentários do usuário:", error);
      return res.status(500).json({
        erro: "Erro ao buscar seus comentários",
      });
    }
  },
};

module.exports = comentarioController;
