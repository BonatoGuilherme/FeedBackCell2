const express = require("express");
const celularController = require("../controllers/celularesController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Rotas públicas
router.get("/", celularController.getAll);
router.get("/:id", celularController.getById);

// Rotas protegidas
router.post("/", authMiddleware, celularController.create);
router.put("/:id", authMiddleware, celularController.update);
router.delete("/:id", authMiddleware, celularController.delete);
router.get("/meus-itens", authMiddleware, celularController.getMyItems);

module.exports = router;
