const express = require("express");
const comentarioController = require("../controllers/comentariosController");
const authMiddleware = require("../middlewares/authMiddleware");
const validateInput = require("../middlewares/validateInput");
const { comentarioSchema } = require("../middlewares/schemas");

const router = express.Router({ mergeParams: true });

// Rotas públicas
router.get("/meus-comentarios", authMiddleware, comentarioController.getMyComments);
router.get("/:idcelular", comentarioController.getByIdCelular);
router.post(
  "/:idcelular",
  authMiddleware,
  validateInput(comentarioSchema.create),
  comentarioController.create,
);
router.delete(
  "/:idcelular/:idcomentario",
  authMiddleware,
  comentarioController.delete,
);

module.exports = router;
