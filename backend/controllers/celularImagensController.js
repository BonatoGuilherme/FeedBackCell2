const express = require("express");
const celularModel = require("../models/celularModel");
const celularImagemModel = require("../models/celularImagemModel");

const MAX_IMAGEM_BYTES = 5 * 1024 * 1024;
const MAX_IMAGENS_POR_CELULAR = 10;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

// Identifica o formato pelo conteúdo (assinatura), não pelo header enviado.
function detectarMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function parseId(value) {
  return typeof value === "string" && /^[1-9]\d{0,9}$/.test(value)
    ? Number(value)
    : null;
}

const imagemUrl = (idimagem) => `/celulares/imagens/${idimagem}`;

// Lê o corpo binário e traduz o erro de tamanho para uma resposta clara.
function rawImageBody(req, res, next) {
  express.raw({ type: TIPOS_ACEITOS, limit: MAX_IMAGEM_BYTES })(
    req,
    res,
    (error) => {
      if (error && error.type === "entity.too.large") {
        return res
          .status(413)
          .json({ erro: "Cada foto pode ter no máximo 5 MB" });
      }
      return next(error);
    },
  );
}

async function verificarDono(idcelular, userId, res) {
  const celular = await celularModel.getById(idcelular);
  if (!celular) {
    res.status(404).json({ erro: "Celular não encontrado" });
    return false;
  }
  if (celular.idusuario !== userId) {
    res
      .status(403)
      .json({ erro: "Você não tem permissão para alterar este celular" });
    return false;
  }
  return true;
}

const celularImagensController = {
  rawImageBody,

  upload: async (req, res) => {
    try {
      const idcelular = parseId(req.params.id);
      if (!idcelular) return res.status(400).json({ erro: "ID inválido" });

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(415).json({
          erro: "Envie a foto como JPEG, PNG ou WebP no corpo da requisição",
        });
      }

      const mime = detectarMime(req.body);
      if (!mime) {
        return res.status(415).json({
          erro: "Formato de imagem não suportado (use JPEG, PNG ou WebP)",
        });
      }

      if (!(await verificarDono(idcelular, req.userId, res))) return undefined;

      const total = await celularImagemModel.countByCelular(idcelular);
      if (total >= MAX_IMAGENS_POR_CELULAR) {
        return res.status(409).json({
          erro: `Cada celular pode ter no máximo ${MAX_IMAGENS_POR_CELULAR} fotos`,
        });
      }

      const imagem = await celularImagemModel.create(
        idcelular,
        mime,
        req.body,
        total,
      );
      return res.status(201).json({
        mensagem: "Foto enviada com sucesso",
        imagem: { ...imagem, url: imagemUrl(imagem.idimagem) },
      });
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      return res.status(500).json({ erro: "Erro ao enviar foto" });
    }
  },

  list: async (req, res) => {
    try {
      const idcelular = parseId(req.params.id);
      if (!idcelular) return res.status(400).json({ erro: "ID inválido" });

      const imagens = await celularImagemModel.listByCelular(idcelular);
      return res.status(200).json({
        imagens: imagens.map((imagem) => ({
          ...imagem,
          url: imagemUrl(imagem.idimagem),
        })),
      });
    } catch (error) {
      console.error("Erro ao listar fotos:", error);
      return res.status(500).json({ erro: "Erro ao listar fotos" });
    }
  },

  serve: async (req, res) => {
    try {
      const idimagem = parseId(req.params.idimagem);
      if (!idimagem) return res.status(400).json({ erro: "ID inválido" });

      const imagem = await celularImagemModel.getById(idimagem);
      if (!imagem) return res.status(404).json({ erro: "Foto não encontrada" });

      res.set({
        "Content-Type": imagem.mime,
        "Content-Length": imagem.dados.length,
        // o conteúdo de um id nunca muda, então pode ficar em cache
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
      });
      return res.status(200).end(imagem.dados);
    } catch (error) {
      console.error("Erro ao buscar foto:", error);
      return res.status(500).json({ erro: "Erro ao buscar foto" });
    }
  },

  delete: async (req, res) => {
    try {
      const idcelular = parseId(req.params.id);
      const idimagem = parseId(req.params.idimagem);
      if (!idcelular || !idimagem) {
        return res.status(400).json({ erro: "ID inválido" });
      }

      if (!(await verificarDono(idcelular, req.userId, res))) return undefined;

      const removida = await celularImagemModel.delete(idimagem, idcelular);
      if (!removida) return res.status(404).json({ erro: "Foto não encontrada" });
      return res.status(200).json({ mensagem: "Foto removida com sucesso" });
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      return res.status(500).json({ erro: "Erro ao remover foto" });
    }
  },
};

module.exports = {
  ...celularImagensController,
  detectarMime,
  imagemUrl,
  MAX_IMAGENS_POR_CELULAR,
};
