const celularModel = require("../models/celularModel");
const celularImagemModel = require("../models/celularImagemModel");

// Acrescenta `imagens: [{ idimagem, url }]` a cada celular.
async function anexarImagens(celulares) {
  let mapa = new Map();
  try {
    mapa = await celularImagemModel.idsByCelulares(
      celulares.map((c) => c.idcelular),
    );
  } catch (error) {
    // banco ainda sem a tabela de fotos (migração não aplicada): segue sem fotos
    if (!error || error.code !== "ER_NO_SUCH_TABLE") throw error;
  }
  return celulares.map((c) => ({
    ...c,
    imagens: (mapa.get(c.idcelular) || []).map((idimagem) => ({
      idimagem,
      url: `/celulares/imagens/${idimagem}`,
    })),
  }));
}
const { MAX_PAGE_SIZE, parsePagination } = require("../utils/pagination");

const MAX_PRECO_CELULAR = 99999999.99;
const MAX_MODELO_CELULAR_LENGTH = 100;

const celularController = {
  // GET - Listar todos os celulares
  getAll: async (req, res) => {
    try {
      const pagination = parsePagination(req.query);
      if (!pagination) {
        return res
          .status(400)
          .json({
            erro: `Página e limite devem ser inteiros positivos; limite máximo: ${MAX_PAGE_SIZE}`,
          });
      }

      const { page, limit } = pagination;
      const celulares = await celularModel.getAll(page, limit);
      const total = await celularModel.getCount();
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        celulares: await anexarImagens(celulares),
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

      const [celularComImagens] = await anexarImagens([celular]);
      return res.status(200).json(celularComImagens);
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
      const { marca, modelo, preco, descricao, especificacoes, modelo3d } = req.body;
      const idusuario = req.userId;

      // Validação
      if (
        typeof marca !== "string" ||
        typeof modelo !== "string" ||
        preco === undefined
      ) {
        return res.status(400).json({
          erro: "Marca, modelo e preço são obrigatórios",
        });
      }

      if (
        typeof preco !== "number" ||
        !Number.isFinite(preco) ||
        preco < 0 ||
        preco > MAX_PRECO_CELULAR
      ) {
        return res
          .status(400)
          .json({ erro: "Preço não pode ser negativo nem ultrapassar R$ 99.999.999,99" });
      }

      if (
        marca.trim().length < 2 ||
        marca.trim().length > 100 ||
        modelo.trim().length < 2 ||
        modelo.trim().length > MAX_MODELO_CELULAR_LENGTH
      ) {
        return res.status(400).json({
          erro: `Marca deve ter entre 2 e 100 caracteres e modelo entre 2 e ${MAX_MODELO_CELULAR_LENGTH} caracteres`,
        });
      }

      const celular = await celularModel.create(
        marca.trim(),
        modelo.trim(),
        preco,
        descricao ? descricao.trim() : "",
        idusuario,
        especificacoes ?? null,
        modelo3d ?? null,
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
      const { marca, modelo, preco, descricao, especificacoes, modelo3d } = req.body;
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
      if (
        typeof marca !== "string" ||
        typeof modelo !== "string" ||
        preco === undefined
      ) {
        return res.status(400).json({
          erro: "Marca, modelo e preço são obrigatórios",
        });
      }

      if (
        typeof preco !== "number" ||
        !Number.isFinite(preco) ||
        preco < 0 ||
        preco > MAX_PRECO_CELULAR
      ) {
        return res
          .status(400)
          .json({ erro: "Preço não pode ser negativo nem ultrapassar R$ 99.999.999,99" });
      }

      if (
        marca.trim().length < 2 ||
        marca.trim().length > 100 ||
        modelo.trim().length < 2 ||
        modelo.trim().length > MAX_MODELO_CELULAR_LENGTH
      ) {
        return res.status(400).json({
          erro: `Marca deve ter entre 2 e 100 caracteres e modelo entre 2 e ${MAX_MODELO_CELULAR_LENGTH} caracteres`,
        });
      }

      const celularAtualizado = await celularModel.update(
        id,
        marca.trim(),
        modelo.trim(),
        preco,
        descricao ? descricao.trim() : "",
        // sem os campos no corpo, mantém o que já estava salvo
        especificacoes === undefined ? celular.especificacoes : especificacoes,
        modelo3d === undefined ? celular.modelo3d : modelo3d,
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
        celulares: await anexarImagens(celulares),
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
