const express = require("express");
const celularController = require("../controllers/celularesController");
const authMiddleware = require("../middlewares/authMiddleware");
const validateInput = require("../middlewares/validateInput");
const { celularSchema } = require("../middlewares/schemas");

const router = express.Router();

// Rotas públicas
router.get("/", celularController.getAll);
router.get("/meus-itens", authMiddleware, celularController.getMyItems);
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

module.exports = router;
