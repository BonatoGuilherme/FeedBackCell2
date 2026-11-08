const express = require("express");
const celularController = require("../controllers/celularesController");
const imagensController = require("../controllers/celularImagensController");
const especificacoesController = require("../controllers/especificacoesController");
const authMiddleware = require("../middlewares/authMiddleware");
const validateInput = require("../middlewares/validateInput");
const { celularSchema } = require("../middlewares/schemas");

const router = express.Router();

// Rotas públicas
router.get("/", celularController.getAll);
router.get("/meus-itens", authMiddleware, celularController.getMyItems);
// Protegida: consome cota da API externa de especificações.
router.get("/especificacoes", authMiddleware, especificacoesController.buscar);
router.get("/imagens/:idimagem", imagensController.serve);
router.get("/:id/imagens", imagensController.list);
router.get("/:id", celularController.getById);

// Rotas protegidas
router.post(
  "/",
  authMiddleware,
  validateInput(celularSchema.create),
  celularController.create,
);
router.put(
  "/:id",
  authMiddleware,
  validateInput(celularSchema.update),
  celularController.update,
);
router.delete("/:id", authMiddleware, celularController.delete);

// Fotos: uma foto por requisição, corpo binário image/jpeg | image/png | image/webp
router.post(
  "/:id/imagens",
  authMiddleware,
  imagensController.rawImageBody,
  imagensController.upload,
);
router.delete("/:id/imagens/:idimagem", authMiddleware, imagensController.delete);

module.exports = router;
