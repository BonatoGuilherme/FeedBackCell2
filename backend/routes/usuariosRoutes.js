const express = require("express");
const usuarioController = require("../controllers/usuariosController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const validateInput = require("../middlewares/validateInput");
const { usuarioSchema } = require("../middlewares/schemas");

const router = express.Router();

// Rotas protegidas
router.get("/perfil", authMiddleware, usuarioController.getProfile);
router.put(
  "/perfil",
  authMiddleware,
  validateInput(usuarioSchema.updateProfile),
  usuarioController.updateProfile,
);
router.put(
  "/senha",
  authMiddleware,
  validateInput(usuarioSchema.updatePassword),
  usuarioController.updatePassword,
);
router.delete(
  "/conta",
  authMiddleware,
  validateInput(usuarioSchema.deleteAccount),
  usuarioController.deleteAccount,
);

// Admin only
router.get("/", authMiddleware, requireAdmin, usuarioController.getAll);

module.exports = router;
