const express = require("express");
const comentarioController = require("../controllers/comentariosController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router({ mergeParams: true });

// Rotas públicas
router.get("/", comentarioController.getByIdCelular);

// Rotas protegidas
router.post("/", authMiddleware, comentarioController.create);
router.delete("/:idcomentario", authMiddleware, comentarioController.delete);
router.get("/meus-comentarios", authMiddleware, comentarioController.getMyComments);

module.exports = router;
